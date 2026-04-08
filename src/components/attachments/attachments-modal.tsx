"use client"

import React, { useState } from "react"
import { Paperclip, Eye } from "lucide-react"

export interface Attachment {
  id: string
  nomeArquivo: string
  urlArquivo: string
  tamanho: number | null
  tipoMime: string | null
}

interface AttachmentsModalProps {
  anexos: Attachment[]
  isOpen: boolean
  onClose: () => void
}

export function AttachmentsModal({ anexos, isOpen, onClose }: AttachmentsModalProps) {
  if (!isOpen || anexos.length === 0) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-80 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Anexos ({anexos.length})</span>
          <button 
            className="text-slate-400 hover:text-slate-600 text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {anexos.map((anexo) => (
            <div key={anexo.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{anexo.nomeArquivo}</p>
                <p className="text-xs text-slate-500">
                  {anexo.tipoMime} • {anexo.tamanho ? (anexo.tamanho / 1024).toFixed(1) + ' KB' : '-'}
                </p>
              </div>
              <a 
                href={`/api/anexos/${anexo.id}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-md flex items-center gap-1 text-xs font-medium"
              >
                <Eye className="h-4 w-4" />
                Ver
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface AttachmentsButtonProps {
  anexos: Attachment[]
  onOpen: (anexos: Attachment[]) => void
}

export function AttachmentsButton({ anexos, onOpen }: AttachmentsButtonProps) {
  if (!anexos || anexos.length === 0) {
    return <span className="text-slate-400">-</span>
  }
  
  return (
    <button 
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
      onClick={() => onOpen(anexos)}
    >
      <Paperclip className="h-3 w-3" />
      {anexos.length}
    </button>
  )
}

interface AttachmentsCellProps {
  anexos?: Attachment[]
}

export function AttachmentsCell({ anexos }: AttachmentsCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentAnexos, setCurrentAnexos] = useState<Attachment[]>([])
  
  const handleOpen = (anexos: Attachment[]) => {
    setCurrentAnexos(anexos)
    setIsOpen(true)
  }
  
  return (
    <>
      <AttachmentsButton anexos={anexos || []} onOpen={handleOpen} />
      <AttachmentsModal 
        anexos={currentAnexos}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}