import numpy as np
from scipy.spatial import cKDTree
import json
import gc 
import os 
from scipy.spatial import KDTree # Needed for a small hack

# --- Planarity Imports ---
try:
    from eigenvalues import local_eigenvalues
    from geometry_modeling import compute_planarity
    PLANARITY_FUNCS_IMPORTED = True
except ImportError:
    print("  [3D Viewer] Warning: Could not import eigenvalue/planarity functions. Planarity alpha will be skipped.")
    PLANARITY_FUNCS_IMPORTED = False

import logging
logger = logging.getLogger(__name__)



# --- 3D VIEWER HELPER FUNCTIONS ---
# (filter_points_by_views_4d, densify_local_ground)
# ... (These functions are unchanged) ...
def filter_points_by_views_4d(points_to_filter_4d, unique_views_to_remove_3d):
    """
    Filters an N x 4 array based on a set of unique N x 3 views.
    """
    if points_to_filter_4d is None or len(points_to_filter_4d) == 0 or unique_views_to_remove_3d is None:
        return points_to_filter_4d
    
    # Get views of the N x 3 part
    contig = np.ascontiguousarray(points_to_filter_4d[:, :3])
    view = contig.view(np.dtype((np.void, contig.dtype.itemsize * 3))).ravel()
    
    mask_in = np.in1d(view, unique_views_to_remove_3d)
    return points_to_filter_4d[~mask_in]

def densify_local_ground(local_known_ground_xyz, local_raw_points_xyz, k_neighbors=3, max_ground_hag=0.5, max_horizontal_dist=2.0):
    """
    Densifies local ground (P2) using local raw points (P3).
    Returns new ground, new raw points, and the mask used to filter raw points.
    """
    
    if local_known_ground_xyz is None or len(local_known_ground_xyz) == 0:
        mask = np.ones(len(local_raw_points_xyz) if local_raw_points_xyz is not None else 0, dtype=bool)
        return local_known_ground_xyz, local_raw_points_xyz, mask
    
    if local_raw_points_xyz is None or len(local_raw_points_xyz) == 0:
        return local_known_ground_xyz, local_raw_points_xyz, np.array([], dtype=bool)

    try:
        ground_tree = cKDTree(local_known_ground_xyz[:, :2])
        if ground_tree.n == 0:
             raise ValueError("cKDTree is empty")
    except ValueError as e:
         print(f"  [3D Viewer] Error building local ground tree. Error: {e}")
         mask = np.ones(len(local_raw_points_xyz), dtype=bool)
         return local_known_ground_xyz, local_raw_points_xyz, mask

    neighbor_indices_list = ground_tree.query_ball_point(
        local_raw_points_xyz[:, :2],
        r=max_horizontal_dist,
        workers=-1
    )
    
    new_ground_indices = [] 
    for i, neighbor_indices in enumerate(neighbor_indices_list):
        if len(neighbor_indices) >= k_neighbors:
            neighbor_points = local_known_ground_xyz[neighbor_indices]
            avg_ground_z = np.mean(neighbor_points[:, 2])
            raw_z = local_raw_points_xyz[i, 2]
            calculated_hag = raw_z - avg_ground_z
            if abs(calculated_hag) <= max_ground_hag:
                new_ground_indices.append(i)
                
    mask_to_remove = np.zeros(len(local_raw_points_xyz), dtype=bool)
    mask_to_keep = np.ones(len(local_raw_points_xyz), dtype=bool)
    
    if not new_ground_indices:
        return local_known_ground_xyz, local_raw_points_xyz, mask_to_keep

    num_new_ground = len(new_ground_indices)
    print(f"  [3D Viewer] Moved {num_new_ground} points from foliage (P3) to ground context (P2).")

    new_ground_points = local_raw_points_xyz[new_ground_indices]
    new_all_ground_points = np.vstack((local_known_ground_xyz, new_ground_points))
    
    mask_to_remove[new_ground_indices] = True
    mask_to_keep = ~mask_to_remove
    new_raw_points_xyz = local_raw_points_xyz[mask_to_keep]
    
    del neighbor_indices_list, new_ground_indices, new_ground_points
    gc.collect()
    
    return new_all_ground_points, new_raw_points_xyz, mask_to_keep

# --- 3D VIEWER ALPHA CALCULATION FUNCTIONS ---
# (calculate_point_alphas, calculate_height_above_ground, etc.)
# ... (These functions are unchanged) ...
def calculate_point_alphas(distances, max_distance=4.0, min_opacity=0.05, max_opacity=0.8):
    """Alpha based on distance (fade out far points)"""
    if distances is None or len(distances) == 0:
        return np.array([])
    normalized_dist = np.clip(distances / max_distance, 0.0, 1.0)
    opacity_range = max_opacity - min_opacity
    alphas = max_opacity - (normalized_dist * opacity_range)
    return alphas

def calculate_height_above_ground(foliage_points, ground_points, k_neighbors=3, workers=-1):
    """Calculates HAG for each foliage point"""
    if ground_points is None or len(ground_points) < k_neighbors:
        print(f"  [3D Viewer] Not enough ground points ({len(ground_points) if ground_points is not None else 0} < k={k_neighbors}) for HAG calculation. Skipping.")
        return np.zeros(len(foliage_points))
    if foliage_points is None or len(foliage_points) == 0:
        return np.array([])
    print(f"  [3D Viewer] Calculating HAG for {len(foliage_points)} foliage points using k={k_neighbors}...")
    try:
        ground_tree_2d = cKDTree(ground_points[:, :2])
        if ground_tree_2d.n == 0:
             raise ValueError("cKDTree is empty")
    except ValueError as e:
         print(f"  [3D Viewer] Error building ground tree for HAG. Error: {e}")
         return np.zeros(len(foliage_points))
    ground_points_z = ground_points[:, 2]
    _dist, neighbor_indices = ground_tree_2d.query(
        foliage_points[:, :2], k=k_neighbors, workers=workers
    )
    if k_neighbors == 1:
        local_ground_z_array = ground_points_z[neighbor_indices]
    else:
        local_ground_z_array = np.mean(ground_points_z[neighbor_indices], axis=1)
    estimated_hags = np.maximum(0.0, foliage_points[:, 2] - local_ground_z_array)
    del ground_tree_2d, _dist, neighbor_indices, local_ground_z_array
    gc.collect()
    return estimated_hags

def calculate_hag_alphas(hags, max_height=3.0, min_opacity=0.0, max_opacity=1.0):
    """Alpha based on HAG (fade out high points)"""
    if hags is None or len(hags) == 0:
        return np.array([])
    normalized_hag = np.clip(hags / max_height, 0.0, 1.0)
    opacity_range = max_opacity - min_opacity
    alphas = max_opacity - (normalized_hag * opacity_range)
    return alphas

def calculate_planarity_alphas(planarity_scores, min_planarity=0.1, max_planarity=0.6, min_opacity=0.1, max_opacity=1.0):
    """Alpha based on planarity (highlight flat points)"""
    if planarity_scores is None or len(planarity_scores) == 0:
        return np.array([])
    
    if (max_planarity - min_planarity) < 1e-6:
        return np.where(planarity_scores >= min_planarity, max_opacity, min_opacity)
        
    normalized_planarity = (planarity_scores - min_planarity) / (max_planarity - min_planarity)
    normalized_planarity = np.clip(normalized_planarity, 0.0, 1.0)
    opacity_range = max_opacity - min_opacity
    alphas = min_opacity + (normalized_planarity * opacity_range)
    return alphas

def calculate_intensity_alphas(intensities, max_intensity=65535.0, min_opacity=0.1, max_opacity=1.0):
    """
    Alpha based on intensity (highlight bright points).
    Scales from min_opacity (at min_observed_intensity) to max_opacity (at max_intensity).
    """
    if intensities is None or len(intensities) == 0:
        return np.array([])
        
    # Default to a neutral alpha factor of 1.0 (for sentinels)
    alphas = np.full(intensities.shape, 1.0, dtype=np.float32)
    valid_mask = (intensities >= 0)
    
    if not np.any(valid_mask):
        return alphas # No valid intensities, return all 1.0s
    
    valid_intensities = intensities[valid_mask]
    
    # Find the minimum observed valid intensity
    min_observed_intensity = np.min(valid_intensities)
    
    print(f"  [3D Viewer] Intensity range: min_obs={min_observed_intensity}, max_thresh={max_intensity}")

    # Ensure max_intensity is at least as large as min_observed_intensity
    if max_intensity < min_observed_intensity:
        max_intensity = min_observed_intensity
    
    # Calculate the range for normalization
    intensity_range = max_intensity - min_observed_intensity
    
    if intensity_range < 1e-6:
        # Range is zero; all valid points are the same intensity.
        # Map them all to max_opacity (since they are all the "max")
        valid_alphas = max_opacity
    else:
        # Normalize from 0.0 (at min_observed) to 1.0 (at max_intensity)
        normalized_intensity = (valid_intensities - min_observed_intensity) / intensity_range
        normalized_intensity = np.clip(normalized_intensity, 0.0, 1.0)
        
        # Scale to the final opacity range
        opacity_range = max_opacity - min_opacity
        valid_alphas = min_opacity + (normalized_intensity * opacity_range)

    alphas[valid_mask] = valid_alphas
    return alphas


def calculate_cliff_camera_position(pts_sides, ground_context_xyz, center, fov_degrees=60):
    """
    Calculate optimal camera position for viewing a cliff face.
    
    Uses PCA to find the long axis of the cliff, then determines which side
    has lower ground elevation (the viewing side).
    
    Args:
        pts_sides: Nx3 array of cliff face points
        ground_context_xyz: Nx3 array of ground context points  
        center: 3D center point (used for centering in Three.js coords)
        fov_degrees: Camera field of view in degrees
        
    Returns:
        dict with 'position' [x, y, z] in Three.js coords (centered), 
        'distance' for camera distance, or None if calculation fails
    """
    if pts_sides is None or len(pts_sides) < 3:
        return None
    
    try:
        # 1. Do PCA on XY coordinates to find the long axis
        xy_coords = pts_sides[:, :2]
        xy_centered = xy_coords - np.mean(xy_coords, axis=0)
        
        # Covariance matrix and eigendecomposition
        cov_matrix = np.cov(xy_centered.T)
        eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
        
        # Sort by eigenvalue (largest first) - this is the long axis
        sort_idx = np.argsort(eigenvalues)[::-1]
        eigenvalues = eigenvalues[sort_idx]
        eigenvectors = eigenvectors[:, sort_idx]
        
        long_axis = eigenvectors[:, 0]  # First PC is the long axis
        perp_axis = eigenvectors[:, 1]  # Perpendicular to long axis
        
        # 2. Get the cliff centroid in XY
        cliff_centroid_xy = np.mean(xy_coords, axis=0)
        
        # 3. Test which side of the perpendicular axis has lower ground
        if ground_context_xyz is not None and len(ground_context_xyz) > 0:
            ground_xy = ground_context_xyz[:, :2]
            ground_z = ground_context_xyz[:, 2]
            
            # Project ground points onto perpendicular axis relative to cliff centroid
            ground_relative = ground_xy - cliff_centroid_xy
            projections = np.dot(ground_relative, perp_axis)
            
            # Split into two sides
            side_a_mask = projections > 0
            side_b_mask = projections <= 0
            
            if np.any(side_a_mask) and np.any(side_b_mask):
                median_z_a = np.median(ground_z[side_a_mask])
                median_z_b = np.median(ground_z[side_b_mask])
                
                # Camera should be on the lower side (where viewer would stand)
                if median_z_a < median_z_b:
                    view_direction = perp_axis  # Side A is lower
                else:
                    view_direction = -perp_axis  # Side B is lower
            else:
                # Not enough ground on both sides, default to side with more points
                view_direction = perp_axis if np.sum(side_a_mask) > np.sum(side_b_mask) else -perp_axis
        else:
            # No ground context, just pick a side
            view_direction = perp_axis
        
        # 4. Calculate required distance to fit cliff in view
        # Get cliff bounding box extents
        cliff_min = np.min(pts_sides, axis=0)
        cliff_max = np.max(pts_sides, axis=0)
        cliff_extent = cliff_max - cliff_min
        
        # Maximum extent we need to fit
        max_extent = np.max(cliff_extent)

        # Calculate distance needed to fit this extent in view
        fov_rad = np.radians(fov_degrees)
        required_distance = (max_extent / 2) / np.tan(fov_rad / 2)
        
        # Add some padding
        camera_distance = max(required_distance * 1.5, 15.0)
        
        # 5. Calculate camera position in original coordinates
        cliff_centroid_z = np.mean(pts_sides[:, 2])
        camera_pos_original = np.array([
            cliff_centroid_xy[0] + view_direction[0] * camera_distance,
            cliff_centroid_xy[1] + view_direction[1] * camera_distance,
            cliff_centroid_z + cliff_extent[2] * 0.3  # Slightly above center
        ])
        
        # 6. Convert to Three.js coordinates (centered, Y/Z swapped)
        camera_pos_centered = camera_pos_original - center
        camera_pos_threejs = [
            float(camera_pos_centered[0]),   # X stays X
            float(camera_pos_centered[2]),   # Z becomes Y (up)
            float(camera_pos_centered[1])    # Y becomes Z (depth)
        ]
        
        print(f"  [3D Viewer] Cliff camera: distance={camera_distance:.1f}m, "
              f"extent={max_extent:.1f}m, pos={camera_pos_threejs}")
        
        return {
            'position': camera_pos_threejs,
            'distance': float(camera_distance)
        }
        
    except Exception as e:
        print(f"  [3D Viewer] Warning: Could not calculate cliff camera position: {e}")
        return None


# --- 3D VIEWER CORE FUNCTIONS ---
# (get_points_for_viewer is unchanged)
def get_points_for_viewer(points_data, center):
    """
    Helper function to prepare point cloud data for the 3D viewer.
    Receives 4D (XYZI) data and calculates all alphas locally.
    """
    viewer_data = []
    
    color_map = {
        "top": [1.0, 0.0, 0.0],
        "sides": [0.95, 0.25, 0.25],
        "ground": [0.05, 0.05, 0.95],
        "ground_context": [0.1, 0.3, 0.8], # Darker Blue
        "foliage_context": [1.0, 1.0, 1.0]  # White
    }

    (p1_top_4d, p1_sides_4d, p1_ground_4d, 
     ground_context_4d, foliage_context_4d) = points_data

    # --- Extract XYZ and Intensity data ---
    def split_4d(arr):
        if arr is None or len(arr) == 0:
            return None, None
        return arr[:, :3], arr[:, 3]

    pts_top, p1_top_intensity = split_4d(p1_top_4d)
    pts_sides, p1_sides_intensity = split_4d(p1_sides_4d)
    pts_ground, _ = split_4d(p1_ground_4d)
    ground_context_xyz, _ = split_4d(ground_context_4d)
    foliage_context_xyz, foliage_context_intensity = split_4d(foliage_context_4d)

    # --- Local Densification ---
    ground_context_processed, foliage_context_processed_xyz, foliage_keep_mask = densify_local_ground(
        ground_context_xyz, 
        foliage_context_xyz,
        k_neighbors=3,
        max_ground_hag=0.5,
        max_horizontal_dist=2.0
    )

    if foliage_context_intensity is not None and foliage_keep_mask is not None and len(foliage_keep_mask) == len(foliage_context_intensity):
        p3_intensity = foliage_context_intensity[foliage_keep_mask]
    else:
        p3_intensity = foliage_context_intensity
        
    p3_foliage = foliage_context_processed_xyz

    # --- Helper to process a single point cloud ---
    def process_cloud(points, name, base_color_rgb, alphas=None):
        if points is not None and len(points) > 0:
            centered_points = points - center 
            three_js_points = np.empty_like(centered_points)
            three_js_points[:, 0] = centered_points[:, 0] # X
            three_js_points[:, 1] = centered_points[:, 2] # Z becomes Y
            three_js_points[:, 2] = -centered_points[:, 1] # Y becomes -Z (Fix Mirror)
            positions = three_js_points.flatten().tolist()
            num_points = len(points)
            rgba_colors = np.zeros((num_points, 4), dtype=np.float32)
            rgba_colors[:, :3] = base_color_rgb
            if alphas is None:
                rgba_colors[:, 3] = 1.0
            else:
                if len(alphas) != num_points:
                    print(f"  [3D Viewer] Warning: Alpha/point mismatch for '{name}'. {len(alphas)} vs {num_points}. Using 1.0.")
                    rgba_colors[:, 3] = 1.0
                else:
                    rgba_colors[:, 3] = alphas
            colors_flat = rgba_colors.flatten().tolist()
            viewer_data.append({
                "name": name,
                "positions": positions,
                "colors": colors_flat
            })

    # --- P1 and P2 PROCESSING (Opaque) ---
    process_cloud(pts_top, "top", color_map["top"])
    process_cloud(pts_sides, "sides", color_map["sides"])
    process_cloud(pts_ground, "ground", color_map["ground"])
    process_cloud(ground_context_processed, "ground_context", color_map["ground_context"])

    # --- P3 (FOLIAGE) PER-POINT ALPHA ---
    if p3_foliage is not None and len(p3_foliage) > 0:
        
        # --- 1. Calculate Distance-based Alpha ---
        p1_points_list = []
        if pts_top is not None and len(pts_top) > 0: p1_points_list.append(pts_top)
        if pts_sides is not None and len(pts_sides) > 0: p1_points_list.append(pts_sides)
        
        p1_combined_xyz = None
        if p1_points_list:
            p1_combined_xyz = np.vstack(p1_points_list)

        if p1_combined_xyz is None or len(p1_combined_xyz) == 0:
            alphas_distance = np.full(len(p3_foliage), 0.2)
        else:
            p1_tree = cKDTree(p1_combined_xyz[:, :2])
            distances, _ = p1_tree.query(p3_foliage[:, :2], k=1, workers=-1)
            alphas_distance = calculate_point_alphas(
                distances, 
                max_distance=5.0, min_opacity=.4, max_opacity=1.0
            )
            del p1_tree, distances
        
        # --- 2. Calculate HAG-based Alpha ---
        hags = calculate_height_above_ground(
            p3_foliage, 
            ground_context_processed,
            workers=-1
        )
        alphas_hag = calculate_hag_alphas(
            hags, 
            max_height=4.0, min_opacity=0.4, max_opacity=1.0
        )
        
        # --- 3. Calculate Planarity-based Alpha (with Dynamic Threshold) ---
        min_planarity_threshold = 0.1
        default_max_planarity = 0.6
        dynamic_max_planarity = default_max_planarity

        if PLANARITY_FUNCS_IMPORTED and p1_combined_xyz is not None and len(p1_combined_xyz) > 16:
            try:
                print(f"  [3D Viewer] Calculating avg planarity for {len(p1_combined_xyz)} P1 points...")
                p1_eigs = local_eigenvalues(p1_combined_xyz, k=16)
                p1_planarity = compute_planarity(p1_eigs)
                avg_p1_planarity = np.mean(p1_planarity)
                if avg_p1_planarity > (min_planarity_threshold + 0.05):
                    dynamic_max_planarity = avg_p1_planarity
                    print(f"  [3D Viewer] Using dynamic max_planarity: {dynamic_max_planarity:.3f}")
                else:
                    print(f"  [3D Viewer] Warning: Avg P1 planarity ({avg_p1_planarity:.3f}) too close to min. Using default {default_max_planarity}.")
                del p1_eigs, p1_planarity, avg_p1_planarity
            except Exception as e:
                print(f"  [3D Viewer] Error calculating P1 planarity: {e}. Using default.")
        
        if PLANARITY_FUNCS_IMPORTED and len(p3_foliage) > 16:
            print(f"  [3D Viewer] Calculating planarity for {len(p3_foliage)} foliage points...")
            eigs = local_eigenvalues(p3_foliage, k=16) 
            planarity = compute_planarity(eigs)
            alphas_planarity = calculate_planarity_alphas(
                planarity,
                min_planarity=min_planarity_threshold,
                max_planarity=dynamic_max_planarity,
                min_opacity=0.4, max_opacity=1.0
            )
            del eigs, planarity
        else:
            alphas_planarity = np.full(len(p3_foliage), 1.0)
            
        del p1_combined_xyz # Clean up P1 data
            
        # --- 4. Calculate Intensity-based Alpha (with Dynamic Threshold) ---
        default_max_intensity = 65535.0
        dynamic_max_intensity = default_max_intensity
        
        p1_intensities_list = []
        if p1_top_intensity is not None: p1_intensities_list.append(p1_top_intensity)
        if p1_sides_intensity is not None: p1_intensities_list.append(p1_sides_intensity)

        if p1_intensities_list:
            p1_intensities = np.hstack(p1_intensities_list)
            if p1_intensities.size > 0:
                dynamic_max_intensity = np.percentile(p1_intensities, 95)
                print(f"    [3D Viewer] Set dynamic max intensity to {dynamic_max_intensity:.0f} (95th percentile of {p1_intensities.size} P1 points)")
            else:
                print("    [3D Viewer] No P1 top/sides intensity, using default 65535.")
        else:
            print("    [3D Viewer] No P1 intensity, using default 65535.")

        alphas_intensity = calculate_intensity_alphas(
            p3_intensity,
            max_intensity=dynamic_max_intensity,
            min_opacity=0.4, max_opacity=1.0
        )

        # --- 5. Combine Alphas ---
        final_alphas = alphas_distance * alphas_hag * alphas_planarity * alphas_intensity
        
        # --- User's edit ---
        final_alphas = final_alphas ** 0.1

        # --- 6. Process the Cloud ---
        process_cloud(
            p3_foliage, 
            "foliage_context", 
            color_map["foliage_context"], 
            alphas=final_alphas 
        )

        del hags, alphas_distance, alphas_hag, alphas_planarity, alphas_intensity, final_alphas
        gc.collect()

    del ground_context_processed, foliage_context_processed_xyz, p3_foliage, p3_intensity
    del pts_top, pts_sides, pts_ground, p1_top_intensity, p1_sides_intensity, ground_context_xyz
    gc.collect()

    return viewer_data


# --- START: JSON SERIALIZABLE FIX (v2) ---
# Add this class to your file, replacing the old one
class NumpyEncoder(json.JSONEncoder):
    """ Custom encoder for numpy types """
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        # --- THIS LINE IS FIXED (no np.float_) ---
        elif isinstance(obj, (np.floating, np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)
# --- END: JSON SERIALIZABLE FIX (v2) ---


def create_interactive_3d_viewer(p1_top_4d, p1_sides_4d, p1_ground_4d, 
                                 ground_context_4d, foliage_context_4d, 
                                 center, metadata, output_html_path, 
                                 add_scale_figure=True,
                                 surface_mesh_data=None):
    """
    Generates a self-contained HTML file with an interactive 3D point cloud viewer.
    Accepts 4D (XYZI) data, a metadata dict, and passes them to the viewer.
    
    (Includes NumpyEncoder fix for JSON serialization and new person placement logic)
    """
    
    # 1. Prepare data for JSON serialization
    points_data = (p1_top_4d, p1_sides_4d, p1_ground_4d, 
                   ground_context_4d, foliage_context_4d)
    
    viewer_data_list = get_points_for_viewer(points_data, center)
    json_data = json.dumps(viewer_data_list, cls=NumpyEncoder)
    
    # Prepare Surface Mesh JSON
    # Expects surface_mesh_data to be a dict with {"vertices": [x,y,z,...], "faces": [i,j,k,...]}
    # Vertices should already be centered relative to 'center' or handled by the caller.
    # WAIT: Usually we pass raw coords and center them here. 
    # But trimesh is complex. Let's assume the caller passes CENTERED vertices or we subtract here?
    # Better: The caller (step1_visualize) has 'center'. It should center them before passing or we do it here.
    # Let's assume the caller passes VALID JSON-ready dict (list of floats).
    # If the caller provides trimesh object, we'd need trimesh here.
    # User said "remove any new code... logic... in step1_visualize".
    # So step1_visualize should generate the dict.
    
    surface_mesh_json = "null"
    if surface_mesh_data is not None:
         surface_mesh_json = json.dumps(surface_mesh_data, cls=NumpyEncoder)

    
    # --- Serialize metadata ---
    metadata_json = json.dumps(metadata, cls=NumpyEncoder) # Handles if metadata is None

    # --- Scale Figure logic ---
    pts_ground = p1_ground_4d[:, :3] if p1_ground_4d is not None and len(p1_ground_4d) > 0 else None
    pts_sides = p1_sides_4d[:, :3] if p1_sides_4d is not None and len(p1_sides_4d) > 0 else None
    pts_top = p1_top_4d[:, :3] if p1_top_4d is not None and len(p1_top_4d) > 0 else None
    ground_context_points = ground_context_4d[:, :3] if ground_context_4d is not None and len(ground_context_4d) > 0 else None

    person_json = "null"
    all_ground_for_person = []
    if pts_ground is not None and len(pts_ground) > 0:
        all_ground_for_person.append(pts_ground)
    if ground_context_points is not None and len(ground_context_points) > 0:
        all_ground_for_person.append(ground_context_points)
    logger.debug(f"len(all_ground_for_person): {len(all_ground_for_person)}")
    logger.debug(f'metadata["type"]: {metadata["type"]}')

    if metadata["type"].lower() == "cliff":
        if add_scale_figure and pts_sides is not None and len(pts_sides) > 0 and len(all_ground_for_person) > 0:
            try:
                combined_ground = np.vstack(all_ground_for_person)
                
                # --- START: New Placement Logic ---
                target_xy = None
                target_ground_tree_points = None
                bottom_ground_points = None # Define for later
                
                try:
                    # 1. Find cliff Z-midpoint from labeled sides
                    sides_z = pts_sides[:, 2]
                    min_z = np.min(sides_z)
                    max_z = np.max(sides_z)
                    mid_z = min_z + (max_z - min_z) / 2.0
                    
                    # 2. Split ALL context ground points
                    bottom_ground_mask = combined_ground[:, 2] < mid_z
                    top_ground_mask = combined_ground[:, 2] >= mid_z
                    
                    bottom_ground_points = combined_ground[bottom_ground_mask]
                    top_ground_points = combined_ground[top_ground_mask]

                    # 3. Check if we have points to define the line
                    if len(bottom_ground_points) > 0 and len(top_ground_points) > 0:
                        # 4. Get 2D centroids
                        low_centroid = np.mean(bottom_ground_points[:, :2], axis=0)
                        high_centroid = np.mean(top_ground_points[:, :2], axis=0)
                        
                        # 5. Define line vector
                        line_v = high_centroid - low_centroid
                        if np.linalg.norm(line_v) < 1e-6:
                            raise ValueError("Top and bottom ground centroids are too close.")
                        
                        # 6. Project labeled cliff points (pts_sides) onto the line
                        sides_xy = pts_sides[:, :2]
                        u_vectors = sides_xy - low_centroid # (N, 2)
                        v_vector = line_v                   # (2,)
                        
                        proj_scalars = np.dot(u_vectors, v_vector) / np.dot(v_vector, v_vector) # (N,)
                        projected_points = low_centroid + proj_scalars[:, np.newaxis] * v_vector # (N, 2)
                        
                        # 7. Find closest projected cliff point to the low centroid
                        dists_to_low = np.linalg.norm(projected_points - low_centroid, axis=1)
                        closest_projected_cliff_point = projected_points[np.argmin(dists_to_low)]
                        
                        # 8. Find target XY (midpoint)
                        target_xy = (low_centroid + closest_projected_cliff_point) / 2.0
                        target_ground_tree_points = bottom_ground_points
                        print(f"  [PID {os.getpid()}] Using new projection-based person placement.")
                    
                    else:
                        raise ValueError("Non-cliff, or not enough top/bottom ground points for new projection logic.")

                except Exception as e_proj:
                    # --- FALLBACK LOGIC ---
                    print(f"  [PID {os.getpid()}] Warning: Projection placement failed ({e_proj}). Reverting to fallback.")
                    
                    if bottom_ground_points is not None and len(bottom_ground_points) > 0:
                        target_ground_points = bottom_ground_points
                    else:
                        target_ground_points = combined_ground # Use all ground if bottom failed
                    
                    if len(target_ground_points) == 0:
                        raise ValueError("No ground points available for fallback placement.")

                    side_centroid_xy = np.mean(pts_sides[:, :2], axis=0)
                    ground_tree_2d_fallback = cKDTree(target_ground_points[:, :2])
                    dist, idx = ground_tree_2d_fallback.query(side_centroid_xy)
                    cliff_base_point = target_ground_points[idx]
                    
                    # Try to define "away" vector
                    vec = None
                    if bottom_ground_points is not None and len(bottom_ground_points) > 0 and top_ground_points is not None and len(top_ground_points) > 0:
                        low_centroid = np.mean(bottom_ground_points[:, :2], axis=0)
                        high_centroid = np.mean(top_ground_points[:, :2], axis=0)
                        vec = low_centroid - high_centroid
                    
                    if vec is None or np.linalg.norm(vec) < 1e-6:
                        vec = cliff_base_point[:2] - center[:2] # Fallback to center
                    
                    vec_norm = vec / (np.linalg.norm(vec) + 1e-6)
                    target_xy = cliff_base_point[:2] + vec_norm * 1.0
                    target_ground_tree_points = target_ground_points
                    # --- END FALLBACK ---

                # --- FINAL Z-PLACEMENT (Common to both logic paths) ---
                if target_xy is None or target_ground_tree_points is None or len(target_ground_tree_points) == 0:
                    raise ValueError("Target XY or ground points not set after placement logic.")
                    
                final_ground_tree_2d = cKDTree(target_ground_tree_points[:, :2])
                dist, idx_at_target = final_ground_tree_2d.query(target_xy)
                final_ground_point = target_ground_tree_points[idx_at_target]
                
                person_height = 1.7018
                person_base_pos = np.array([
                    target_xy[0],           # Final X
                    target_xy[1],           # Final Y
                    final_ground_point[2]   # Z from ground at (X,Y)
                ])
                # --- END: New Placement Logic ---
                
                person_base_centered = person_base_pos - center
                person_base_threejs = [person_base_centered[0], person_base_centered[2], person_base_centered[1]]
                
                person_json = json.dumps({"base": person_base_threejs, "height": person_height}, cls=NumpyEncoder)
            
            except Exception as e:
                print(f"  [PID {os.getpid()}] Warning: Could not generate scale figure due to error. {e}")
                person_json = "null"
        else:
            if add_scale_figure:
                logger.error(f"  [PID {os.getpid()}] Error: Skipping scale figure generation for this cluster.")
                if pts_sides is None:
                    logger.debug(f"pts_sides is None.")
                if all_ground_for_person is None:
                    logger.debug(f"all_ground_for_person is None.")
                else:
                    logger.debug(f"len(all_ground_for_person): {len(all_ground_for_person)}")
            person_json = "null"
    elif add_scale_figure:
        # this is a boulder
        logger.debug("Adding scale figure for boulder.")

        boulder_pts_xy = pts_top[:,:2]
        if pts_sides:
            boulder_pts_xy = np.vstack(boulder_pts_xy, pts_sides[:,:2])
        boulder_centroid_xy = np.mean(boulder_pts_xy, axis=0)
        logger.debug(f"Boulder XY centroid is. {boulder_centroid_xy}")

        max_y_position = np.max(pts_top[:,:2], axis=0)[1]
        logger.debug(f"Max y position: {max_y_position}")

        # use the vector heading toward the default camera position
        # camera default is 0, 10, 25 (relative to boulder centroid)
        # Note that camera is 10m out, person is 1.5 m out from boulder point closest to camera
        person_xy = [boulder_centroid_xy[0], max_y_position + 1.5]
        logger.debug(f"Person xy is {person_xy}")

        # find the closest ground point to this 
        all_ground_for_person = np.vstack(all_ground_for_person)
        logger.debug(f"Making ground tree for all_ground_for_person (shape {all_ground_for_person.shape})")
        ground_tree_2d = cKDTree(all_ground_for_person[:, :2])
        logger.debug(f"Getting closest ground point to person.")
        dist, idx = ground_tree_2d.query(person_xy)

        logger.debug(f"Closest ground point is {dist} away.")
        final_ground_point = all_ground_for_person[idx,:]
        logger.debug(f"Closest ground point is {final_ground_point}")
        
        person_height = 1.7018
        person_base_pos = np.array([
            final_ground_point[0],           # Final X
            final_ground_point[1],           # Final Y
            final_ground_point[2]   # Z from ground at (X,Y)
        ])
        # --- END: New Placement Logic ---
        
        person_base_centered = person_base_pos - center
        person_base_threejs = [person_base_centered[0], person_base_centered[2], person_base_centered[1]]
        
        person_json = json.dumps({"base": person_base_threejs, "height": person_height}, cls=NumpyEncoder)


    # --- Camera Position for Cliffs ---
    camera_json = "null"
    is_cliff = metadata is not None and metadata.get('type') == 'Cliff'
    
    if is_cliff and pts_sides is not None and len(pts_sides) > 0:
        # Combine all available ground for camera calculation
        all_ground_for_camera = []
        if pts_ground is not None and len(pts_ground) > 0:
            all_ground_for_camera.append(pts_ground)
        if ground_context_points is not None and len(ground_context_points) > 0:
            all_ground_for_camera.append(ground_context_points)
        
        combined_ground_for_camera = np.vstack(all_ground_for_camera) if all_ground_for_camera else None
        
        camera_data = calculate_cliff_camera_position(
            pts_sides, 
            combined_ground_for_camera, 
            center
        )
        if camera_data is not None:
            camera_json = json.dumps(camera_data, cls=NumpyEncoder)

    # 2. Define the HTML template (Slider height is fixed here)
    html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>3D Point Cloud Viewer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body {{ 
            margin: 0; 
            background-color: #111; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
        }}
        canvas {{ display: block; }}
        
        /* --- LEGEND/INFO (MOVED TO BOTTOM) --- */
        #info {{
            position: absolute;
            bottom: 10px;
            width: 100%;
            text-align: center;
            color: #777;
            font-size: clamp(10px, 2.5vw, 12px);
            z-index: 100;
            pointer-events: none;
        }}
        
        /* --- ID TEXT (TOP CENTER) --- */
        #title-panel {{
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30,30,30,0.8);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            padding: 5px 10px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            font-size: clamp(12px, 3vw, 15px);
            font-weight: 600;
            z-index: 100;
            word-break: break-all;
            max-width: 60%;
            text-align: center;
        }}
        
        /* --- RIGHT PANEL (DETAILS + SLIDER) --- */
        #right-panel {{
            position: absolute;
            top: 50%;
            right: clamp(6px, 2vw, 15px);
            transform: translateY(-50%);
            background: rgba(30,30,30,0.8);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            padding: clamp(8px, 2vw, 12px);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            z-index: 100;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: stretch; 
            gap: clamp(4px, 1.5vw, 10px);
        }}

        /* --- Metadata inside right panel --- */
        #metadata-content {{
            display: flex;
            flex-direction: column;
            gap: clamp(2px, 0.6vw, 5px); 
        }}
        #metadata-content .meta-row {{
            margin: 0;
            font-size: clamp(11px, 2.8vw, 13px);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            color: #eee;
        }}
        #metadata-content .meta-label {{
            color: #888;
            font-size: clamp(10px, 2.5vw, 11px);
        }}
        
        /* --- Copy GPS Button Style --- */
        #copyLatLonBtn {{
            width: 100%;
            padding: clamp(5px, 1.2vw, 7px);
            margin-top: clamp(2px, 0.8vw, 6px); 
            font-size: clamp(10px, 2.5vw, 12px);
            font-weight: 600;
            color: #111;
            background-image: linear-gradient(to top, #777, #ccc);
            border: 1px solid #555;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
        }}
        #copyLatLonBtn:hover {{
            background-image: linear-gradient(to top, #888, #ddd);
            border-color: #666;
        }}
        #copyLatLonBtn:active {{
            background-image: linear-gradient(to top, #666, #bbb);
            transform: translateY(1px);
            box-shadow: none;
        }}
        
        /* --- Divider --- */
        #right-panel hr.divider {{
            border: none;
            height: 1px;
            background-color: rgba(255,255,255,0.15);
            margin: 0; 
        }}
        
        /* --- Slider styles --- */
        #right-panel label {{
            font-weight: 500;
            color: #aaa;
            text-align: center;
            font-size: clamp(10px, 2.5vw, 11px);
        }}
        .slider-container {{
            width: 36px; 
            height: clamp(50px, 12vw, 80px);
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 3px 0;
            align-self: center; 
        }}
        input[type="range"] {{
            -webkit-appearance: none;
            appearance: none;
            width: clamp(50px, 12vw, 80px);
            height: 28px;
            background: transparent;
            cursor: pointer;
            transform: rotate(270deg);
        }}
        input[type="range"]::-webkit-slider-runnable-track {{
            width: 100%; height: 5px; background: #222;
            border-radius: 3px; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
        }}
        input[type="range"]::-webkit-slider-thumb {{
            -webkit-appearance: none; appearance: none;
            margin-top: -6px; height: 27px; width: 24px;
            background-image: linear-gradient(to top, #777, #ccc);
            border: 1px solid #555; border-radius: 3px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }}
        input[type="range"]::-moz-range-track {{
            width: 100%; height: 5px; background: #222;
            border-radius: 3px; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
        }}
        input[type="range"]::-moz-range-thumb {{
            height: 17px; width: 24px;
            background-image: linear-gradient(to top, #777, #ccc);
            border: 1px solid #555; border-radius: 3px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: none;
        }}
    </style>
</head>
<body>
    <div id="info">
        Drag to rotate | Scroll to zoom | Right-click-drag to pan<br/>
        Colors: Red=Top, Pink=Sides, Blue=Ground, White=Context
    </div>

    <div id="title-panel">
        </div>

    <div id="right-panel">
        <div id="metadata-content">
            </div>
        <button id="copyLatLonBtn">Copy GPS</button>
        <hr class="divider">
        <label for="opacitySlider">Context</label>
        <div class="slider-container">
            <input type="range" id="opacitySlider" min="0" max="1" step="0.05" value="0.0">
        </div>
        <hr class="divider">
        <div style="margin-top: 5px; text-align: center;">
            <input type="checkbox" id="surfaceToggle" checked style="transform: scale(1.2); vertical-align: middle; cursor: pointer;">
            <label for="surfaceToggle" style="vertical-align: middle; cursor: pointer; color: #eee; font-size: 11px;">Surface</label>
        </div>
    </div>

    <script type="importmap">
    {{
        "imports": {{
            "three": "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/"
        }}
    }}
    </script>
    <script type="module">
        import * as THREE from 'three';
        import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';
        
        const pointData = {json_data};
        const personData = {person_json};
        const metadata = {metadata_json}; // Will be null if not passed

        const cameraData = {camera_json}; // Camera position for cliffs
        const surfaceData = {surface_mesh_json}; // Surface mesh data
        
        let scene, camera, renderer, controls;
        let pointClouds = [];
        let foliageCloud = null; 
        
        function init() {{
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111111);
            
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            // Use calculated camera position for cliffs, otherwise default
            if (cameraData && cameraData.position) {{
                camera.position.set(cameraData.position[0], cameraData.position[1], cameraData.position[2]);
            }} else {{
                camera.position.set(0, 10, 25);
            }}
            scene.add(camera);
            
            renderer = new THREE.WebGLRenderer({{ antialias: true }});
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);
            
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 0.1;
            controls.maxDistance = 500;
            controls.target.set(0, 0, 0); 
            
            // --- Add Lights ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(50, 200, 100);
            scene.add(dirLight);
            
            // --- Create Point Clouds ---
            pointData.forEach(data => {{
                if (!data.positions || data.positions.length === 0) return;
                
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 4));
                
                let material;
                if (data.name === 'top' || data.name === 'sides' || data.name === 'ground' || data.name === 'ground_context') {{
                    material = new THREE.PointsMaterial({{
                        size: (data.name === 'ground_context') ? 0.05 : 0.1, 
                        vertexColors: true,
                        sizeAttenuation: true,
                        transparent: true
                    }});
                }} 
                else if (data.name === 'foliage_context') {{
                    material = new THREE.PointsMaterial({{
                        size: 0.05, 
                        vertexColors: true,
                        sizeAttenuation: true,
                        transparent: true,
                        opacity: 0.0 // Start at 0 opacity
                    }});
                }}
                else {{ 
                    material = new THREE.PointsMaterial({{
                        size: 0.05,
                        vertexColors: true,
                        sizeAttenuation: true,
                        transparent: true
                    }});
                }}
                const points = new THREE.Points(geometry, material);
                points.name = data.name;
                scene.add(points);
                pointClouds.push(points);

                if (data.name === 'foliage_context') {{
                    foliageCloud = points;
                }}
            }});
            
            const axesHelper = new THREE.AxesHelper(5);
            scene.add(axesHelper);

            // --- Surface Mesh Rendering ---
            if (surfaceData) {{
                // Create Geometry
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(surfaceData.vertices, 3));
                geometry.setIndex(surfaceData.faces);
                geometry.computeVertexNormals();

                // Create Material (Semi-transparent, specular)
                const material = new THREE.MeshPhysicalMaterial({{
                    color: 0xcccccc,        // Light Gray
                    transparent: true,
                    opacity: 0.5,           // Semi-transparent
                    roughness: 0.2,         // Slightly shiny
                    metalness: 0.1,
                    clearcoat: 0.5,         // Adds specular shine layer
                    clearcoatRoughness: 0.1,
                    side: THREE.DoubleSide, // Render both sides
                    flatShading: false,
                    depthWrite: false       // Fix flickering for transparent objects
                }});

                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = 'boulder_surface';
                scene.add(mesh);
                window.surfaceMesh = mesh; // Expose for toggle
            }}
            // ------------------------------

            // --- Scale Figure JS ---
            if (personData) {{
                // (Person drawing logic remains unchanged)
                const figureHeight = personData.height;
                const basePosition = new THREE.Vector3(personData.base[0], personData.base[1], personData.base[2]);
                const figureColor = 0xFFFF00; 
                const limbRadius = figureHeight * 0.02; 
                const jointRadius = figureHeight * 0.03; 
                const figureGroup = new THREE.Group();
                figureGroup.position.copy(basePosition);
                scene.add(figureGroup);
                const footHeight = figureHeight * 0.05; 
                const legLength = figureHeight * 0.45;
                const torsoLength = figureHeight * 0.35;
                const armLength = figureHeight * 0.31;
                const neckLength = figureHeight * 0.1;
                const shoulderWidth = figureHeight * 0.28;
                const shoulderDrop = figureHeight * 0.01;
                const hipWidth = figureHeight * 0.15;
                const elbowOutExtent = figureHeight * 0.01; 
                const handsOutExtent = figureHeight * 0.015; 
                const legApartExtent = figureHeight * 0.08; 
                const leftFoot = new THREE.Vector3(-legApartExtent, footHeight, 0);
                const rightFoot = new THREE.Vector3(legApartExtent, footHeight, 0);
                const hipCenterY = footHeight + legLength;
                const hipCenter = new THREE.Vector3(0, hipCenterY, 0);
                const leftHip = new THREE.Vector3(-hipWidth / 2, hipCenterY, 0);
                const rightHip = new THREE.Vector3(hipWidth / 2, hipCenterY, 0);
                const shoulderCenterY = hipCenterY + torsoLength;
                const shoulderCenter = new THREE.Vector3(0, shoulderCenterY, 0);
                const leftShoulder = new THREE.Vector3(-shoulderWidth / 2, shoulderCenterY - shoulderDrop, 0);
                const rightShoulder = new THREE.Vector3(shoulderWidth / 2, shoulderCenterY - shoulderDrop, 0);
                const neckBase = new THREE.Vector3(0, shoulderCenterY + neckLength / 2, 0);
                const headCenterY = shoulderCenterY + neckLength + jointRadius; 
                const headCenter = new THREE.Vector3(0, headCenterY, 0);
                const leftElbow = new THREE.Vector3(leftShoulder.x - elbowOutExtent, shoulderCenterY - shoulderDrop - armLength * 0.45, 0);
                const rightElbow = new THREE.Vector3(rightShoulder.x + elbowOutExtent, shoulderCenterY  - shoulderDrop - armLength * 0.45, 0);
                const leftHand = new THREE.Vector3(leftShoulder.x - handsOutExtent, rightElbow.y - shoulderDrop - armLength * 0.55, 0);
                const rightHand = new THREE.Vector3(rightShoulder.x + handsOutExtent, rightElbow.y - shoulderDrop - armLength * 0.55, 0);
                
                function createTube(start, end, radius, color) {{
                    const path = new THREE.CatmullRomCurve3([start, end]);
                    const geometry = new THREE.TubeGeometry(path, 1, radius, 8, false); 
                    const material = new THREE.MeshBasicMaterial({{ color: color }});
                    return new THREE.Mesh(geometry, material);
                }}
                function createSphere(position, radius, color) {{
                    const geometry = new THREE.SphereGeometry(radius, 16, 16);
                    const material = new THREE.MeshBasicMaterial({{ color: color }});
                    const sphere = new THREE.Mesh(geometry, material);
                    sphere.position.copy(position);
                    return sphere;
                }}
                
                figureGroup.add(createTube(hipCenter, shoulderCenter, limbRadius, figureColor));
                figureGroup.add(createTube(shoulderCenter, leftShoulder, limbRadius, figureColor));
                figureGroup.add(createTube(shoulderCenter, rightShoulder, limbRadius, figureColor));
                figureGroup.add(createTube(leftFoot, leftHip, limbRadius, figureColor));
                figureGroup.add(createSphere(leftFoot, jointRadius, figureColor)); 
                figureGroup.add(createSphere(leftHip, jointRadius, figureColor)); 
                figureGroup.add(createTube(rightFoot, rightHip, limbRadius, figureColor));
                figureGroup.add(createSphere(rightFoot, jointRadius, figureColor)); 
                figureGroup.add(createSphere(rightHip, jointRadius, figureColor)); 
                figureGroup.add(createTube(leftShoulder, leftElbow, limbRadius, figureColor));
                figureGroup.add(createTube(leftElbow, leftHand, limbRadius, figureColor)); 
                figureGroup.add(createSphere(leftShoulder, jointRadius, figureColor)); 
                figureGroup.add(createSphere(leftElbow, jointRadius, figureColor)); 
                figureGroup.add(createTube(rightShoulder, rightElbow, limbRadius, figureColor));
                figureGroup.add(createTube(rightElbow, rightHand, limbRadius, figureColor)); 
                figureGroup.add(createSphere(rightShoulder, jointRadius, figureColor)); 
                figureGroup.add(createSphere(rightElbow, jointRadius, figureColor)); 
                figureGroup.add(createTube(shoulderCenter, neckBase, limbRadius, figureColor));
                figureGroup.add(createSphere(headCenter, jointRadius * 1.5, figureColor)); 
            }}
            // --- END Scale Figure ---

            // --- Populate Metadata and Title Panels ---
            const metadataContent = document.getElementById('metadata-content');
            const titlePanel = document.getElementById('title-panel');
            const copyBtn = document.getElementById('copyLatLonBtn');
            const rightPanel = document.getElementById('right-panel');
            
            if (metadata && Object.keys(metadata).length > 0) {{
                let detailsHtml = '';
                
                // 1. Handle ID
                if (metadata.ID) {{
                    titlePanel.textContent = metadata.ID;
                }} else {{
                    titlePanel.style.display = 'none';
                }}

                // 2. Build compact metadata display
                // Type (Boulder or Cliff)
                if (metadata.type) {{
                    detailsHtml += `<div class="meta-row">${{metadata.type}}</div>`;
                }}
                
                // Dimensions: L, W, H (must be numbers)
                if (typeof metadata.length === 'number') {{
                    detailsHtml += `<div class="meta-row">${{metadata.length.toFixed(1)}}m <span class="meta-label">L</span></div>`;
                }}
                if (typeof metadata.width === 'number') {{
                    detailsHtml += `<div class="meta-row">${{metadata.width.toFixed(1)}}m <span class="meta-label">W</span></div>`;
                }}
                if (typeof metadata.height === 'number') {{
                    detailsHtml += `<div class="meta-row">${{metadata.height.toFixed(1)}}m <span class="meta-label">H</span></div>`;
                }}
                
                // Distance to road
                if (typeof metadata.dist_to_road === 'number') {{
                    detailsHtml += `<div class="meta-row">${{Math.round(metadata.dist_to_road)}}m <span class="meta-label">to road</span></div>`;
                }}
                
                // Bushwhack / off trail
                if (typeof metadata.bushwhack === 'number') {{
                    detailsHtml += `<div class="meta-row">${{Math.round(metadata.bushwhack)}}m <span class="meta-label">off trail</span></div>`;
                }}
                
                // Coordinates with N/S E/W inferred from sign
                if (typeof metadata.lat === 'number') {{
                    const latDir = metadata.lat >= 0 ? 'N' : 'S';
                    detailsHtml += `<div class="meta-row">${{Math.abs(metadata.lat).toFixed(5)}} <span class="meta-label">${{latDir}}</span></div>`;
                }}
                if (typeof metadata.lon === 'number') {{
                    const lonDir = metadata.lon >= 0 ? 'E' : 'W';
                    detailsHtml += `<div class="meta-row">${{Math.abs(metadata.lon).toFixed(5)}} <span class="meta-label">${{lonDir}}</span></div>`;
                }}
                
                // Elevation
                if (typeof metadata.elevation === 'number') {{
                    detailsHtml += `<div class="meta-row">${{Math.round(metadata.elevation).toFixed(0)}}m <span class="meta-label">elev.</span></div>`;
                }}
                
                metadataContent.innerHTML = detailsHtml;

                // 3. Handle Copy Button
                if (typeof metadata.lat === 'number' && typeof metadata.lon === 'number') {{
                    copyBtn.addEventListener('click', () => {{
                        const latLonString = `${{metadata.lat.toFixed(5)}}, ${{metadata.lon.toFixed(5)}}`;
                        navigator.clipboard.writeText(latLonString).then(() => {{
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => {{ copyBtn.textContent = 'Copy GPS'; }}, 2000);
                        }}, (err) => {{
                            console.error('Failed to copy lat/lon: ', err);
                            copyBtn.textContent = 'Error!';
                            setTimeout(() => {{ copyBtn.textContent = 'Copy GPS'; }}, 2000);
                        }});
                    }});
                }} else {{
                    copyBtn.style.display = 'none';
                }}

            }} else {{
                // Hide all UI elements if no metadata
                titlePanel.style.display = 'none';
                rightPanel.style.display = 'none';
            }}
            // --- END Metadata ---


            // --- EVENT LISTENERS ---
            const opacitySlider = document.getElementById('opacitySlider');
            opacitySlider.addEventListener('input', (event) => {{
                if (!foliageCloud) return; 
                const globalOpacity = parseFloat(event.target.value);
                foliageCloud.material.opacity = globalOpacity;
            }});

            const surfaceToggle = document.getElementById('surfaceToggle');
            if (surfaceToggle) {{
                surfaceToggle.addEventListener('change', (event) => {{
                    if (window.surfaceMesh) {{
                        window.surfaceMesh.visible = event.target.checked;
                    }}
                }});
            }}
            
            window.addEventListener('resize', onWindowResize, false);
        }}
        
        function onWindowResize() {{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }}
        
        function animate() {{
            requestAnimationFrame(animate);
            controls.update();
            render();
        }}
        
        function render() {{
            renderer.render(scene, camera);
        }}
        
        init();
        animate();
    </script>
</body>
</html>
    """

    # 3. Write the HTML file
    try:
        with open(output_html_path, 'w', encoding='utf-8') as f:
            f.write(html_template)
    except Exception as e:
        print(f"  [PID {os.getpid()}] Error writing 3D viewer HTML file: {e}")
        raise

    return output_html_path