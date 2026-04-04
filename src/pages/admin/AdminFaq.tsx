import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { FaqItem } from '@/types'

type FaqForm = { question: string; answer: string; category: string; order: number }

export default function AdminFaq() {
  const [editing, setEditing]   = useState<FaqItem | null | 'new'>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const toast = useToast()
  const qc    = useQueryClient()

  const { data: items = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ['admin-faq'],
    queryFn: async () => {
      const { data } = await db.faq().select('*').order('order', { ascending: true })
      return (data ?? []) as FaqItem[]
    },
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<FaqForm>({ defaultValues: { order: items.length + 1 } })

  function openEdit(item: FaqItem | 'new') {
    setEditing(item)
    if (item !== 'new') {
      reset({ question: item.question, answer: item.answer, category: item.category, order: item.order })
    } else {
      reset({ question: '', answer: '', category: 'general', order: items.length + 1 })
    }
  }

  const save = useMutation({
    mutationFn: async (data: FaqForm) => {
      if (editing === 'new') {
        const { error } = await db.faq().insert({ ...data, is_active: true })
        if (error) throw error
      } else if (editing) {
        const { error } = await db.faq().update(data).eq('id', editing.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing === 'new' ? 'FAQ item created' : 'FAQ item updated')
      qc.invalidateQueries({ queryKey: ['admin-faq'] })
      setEditing(null)
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.faq().update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-faq'] }) },
  })

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.faq().delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['admin-faq'] }) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">FAQ</h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} questions</p>
        </div>
        <button onClick={() => openEdit('new')} className="btn-primary btn-sm gap-1.5">
          <Plus size={16} /> Add Question
        </button>
      </div>

      {/* Edit form */}
      {editing !== null && (
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-600">
          <h2 className="font-semibold text-white mb-4">{editing === 'new' ? 'New FAQ Item' : 'Edit FAQ Item'}</h2>
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-3">
            <div>
              <label className="label text-gray-300">Question *</label>
              <input {...register('question', { required: true })} className="input bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" placeholder="e.g. How do I find a shelter?" />
            </div>
            <div>
              <label className="label text-gray-300">Answer *</label>
              <textarea {...register('answer', { required: true })} className="input bg-gray-700 border-gray-600 text-white min-h-[80px] resize-none" placeholder="Clear, helpful answer…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-gray-300">Category</label>
                <input {...register('category')} className="input bg-gray-700 border-gray-600 text-white" placeholder="general" />
              </div>
              <div>
                <label className="label text-gray-300">Order</label>
                <input {...register('order')} type="number" className="input bg-gray-700 border-gray-600 text-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary">
                {save.isPending ? 'Saving…' : editing === 'new' ? 'Create' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 bg-gray-800 rounded-xl" />)}</div>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`bg-gray-800 rounded-2xl overflow-hidden ${!item.is_active ? 'opacity-60' : ''}`}>
            <button
              className="w-full flex items-start gap-3 p-4 text-left"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              <span className="text-xs text-gray-500 font-mono w-6 mt-0.5 shrink-0">{item.order}.</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{item.question}</p>
                {expanded !== item.id && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.answer}</p>
                )}
              </div>
              <ChevronDown size={15} className={`text-gray-500 shrink-0 mt-0.5 transition-transform ${expanded === item.id ? 'rotate-180' : ''}`} />
            </button>

            {expanded === item.id && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-700">
                <p className="text-sm text-gray-300 mt-3 mb-4 leading-relaxed">{item.answer}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => toggleActive.mutate({ id: item.id, is_active: !item.is_active })}
                    className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors">
                    {item.is_active ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                  <button onClick={() => { if (confirm('Delete this FAQ item?')) deleteFaq.mutate(item.id) }}
                    className="flex items-center gap-1.5 bg-danger-600/80 hover:bg-danger-600 text-white text-xs font-medium rounded-xl px-3 py-1.5 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
