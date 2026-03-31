"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          {React.Children.map(children, (child) => 
            React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { onClose: () => onOpenChange(false) }) : child
          )}
        </div>
      </div>
    </>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

export function DialogContent({ children, className, onClose }: DialogContentProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg", className)}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div />
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-800", className)}>
      {children}
    </h2>
  )
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-500 mt-1", className)}>
      {children}
    </p>
  )
}