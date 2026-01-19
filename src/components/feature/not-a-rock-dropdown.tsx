'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { NotARockType } from '@/lib/types'

interface NotARockDropdownProps {
  value: NotARockType
  onChange: (value: NotARockType) => void
}

export function NotARockDropdown({ value, onChange }: NotARockDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={value ? 'destructive' : 'ghost'}
          size="sm"
          className="flex items-center gap-1.5 text-xs"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {value ? `Not a rock: ${value}` : 'Not a rock?'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange(null)}>
          <span className={!value ? 'font-medium' : ''}>Is a rock</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('tree')}>
          <span className={value === 'tree' ? 'font-medium' : ''}>Tree</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('building')}>
          <span className={value === 'building' ? 'font-medium' : ''}>Building</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('other')}>
          <span className={value === 'other' ? 'font-medium' : ''}>Other</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
