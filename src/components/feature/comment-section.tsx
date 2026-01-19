'use client'

import { useState } from 'react'
import { ThumbsUp, Flag, Reply, MoreHorizontal, Trash2, Edit2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Comment } from '@/lib/types'

interface CommentSectionProps {
  comments: Comment[]
  onAddComment: (comment: Comment) => void
}

function CommentItem({ 
  comment, 
  onReply, 
  onLike,
  onFlag,
  isReply = false 
}: { 
  comment: Comment
  onReply: (parentId: string) => void
  onLike: (id: string) => void
  onFlag: (id: string, reason: string) => void
  isReply?: boolean
}) {
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const isOwn = comment.userId === 'user-1'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.userAvatar || "/placeholder.svg"} />
        <AvatarFallback>{comment.userName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground mt-1">{comment.text}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            className={`flex items-center gap-1 text-xs ${comment.likedByUser ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`}
            onClick={() => onLike(comment.id)}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {comment.likes > 0 && comment.likes}
          </button>
          {!isReply && (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onReply(comment.id)}
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {isOwn ? (
                <>
                  <DropdownMenuItem>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setShowFlagMenu(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onLike={onLike}
                onFlag={onFlag}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentSection({ comments, onAddComment }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId: 'user-1',
      userName: 'Current User',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current',
      text: newComment,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByUser: false,
      replies: [],
    }

    onAddComment(comment)
    setNewComment('')
    setReplyingTo(null)
  }

  const handleLike = (id: string) => {
    // In real app, this would toggle like
    console.log('Like comment:', id)
  }

  const handleFlag = (id: string, reason: string) => {
    console.log('Flag comment:', id, reason)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-foreground">Comments ({comments.length})</h3>

      {/* Add comment */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=current" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {replyingTo && (
        <div className="ml-11 text-xs text-muted-foreground">
          Replying to comment{' '}
          <button className="text-primary hover:underline" onClick={() => setReplyingTo(null)}>
            Cancel
          </button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={setReplyingTo}
            onLike={handleLike}
            onFlag={handleFlag}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  )
}
