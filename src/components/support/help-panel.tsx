'use client'

import { useState } from 'react'
import { X, Send, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HelpPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const body = encodeURIComponent(message)
        const sub = encodeURIComponent(subject)
        window.location.href = `mailto:support@rockpile.app?subject=${sub}&body=${body}`
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Help & Support</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6 bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                        <Mail className="h-5 w-5 text-primary mt-1" />
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Contact Support</p>
                            <p>Have a question or found a bug? Fill out the form below to send us an email. We'll get back to you as soon as possible.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Subject
                            </label>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="How can we help?"
                                className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Message
                            </label>
                            <textarea
                                required
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your issue or feedback..."
                                className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div className="pt-2">
                            <Button type="submit" className="w-full gap-2">
                                <Send className="h-4 w-4" />
                                Send Email
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
