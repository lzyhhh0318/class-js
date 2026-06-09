import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCourseStore, type Material, type KnowledgePoint } from '@/store/course'
import {
  Brain, Send, Sparkles, BookOpen, ChevronDown, ChevronRight,
  MessageCircle, Loader2
} from 'lucide-react'

export default function AIParse() {
  const currentUser = useCourseStore((state) => state.currentUser)
  const courses = useCourseStore((state) => state.courses)
  const materials = useCourseStore((state) => state.materials)
  const selectedCourseId = useCourseStore((state) => state.selectedCourseId)
  
  const storeActions = useCourseStore.getState()
  const fetchCourses = storeActions.fetchCourses
  const fetchMaterials = storeActions.fetchMaterials
  const setSelectedCourse = storeActions.setSelectedCourse
  const parseMaterial = storeActions.parseMaterial
  const askQuestion = storeActions.askQuestion

  const [parsingId, setParsingId] = useState<string | null>(null)
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)

  useEffect(() => { fetchCourses() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMaterials(selectedCourseId || undefined) }, [selectedCourseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const parsedMaterials = materials.filter(m => m.parsedContent)
  const unparsedMaterials = materials.filter(m => !m.parsedContent && m.type !== 'video')

  const handleParse = async (materialId: string) => {
    setParsingId(materialId)
    await parseMaterial(materialId)
    setParsingId(null)
  }

  const handleAsk = async () => {
    if (!question.trim()) return
    setIsAsking(true)
    setAnswer(null)
    const result = await askQuestion(question, selectedCourseId || undefined, selectedMaterialId || undefined)
    setAnswer(result || '抱歉，AI答疑服务暂时不可用。')
    setIsAsking(false)
  }

  const importanceLabel = (imp: KnowledgePoint['importance']) => {
    switch (imp) {
      case 'high': return { text: '核心', color: 'bg-red-500/20 text-red-400' }
      case 'medium': return { text: '重要', color: 'bg-yellow-500/20 text-yellow-400' }
      case 'low': return { text: '辅助', color: 'bg-gray-200 text-gray-500' }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="text-theme" size={20} />
          <h1 className="text-lg font-bold text-gray-900">AI智能解析</h1>
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedCourseId ? 'bg-theme text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            全部
          </button>
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCourseId === c.id ? 'bg-theme text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex gap-4">
        {/* 左侧 - 课件列表 */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-theme" />
              待解析课件
            </h2>
            {unparsedMaterials.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">所有课件均已解析</p>
            ) : (
              <div className="space-y-1.5">
                {unparsedMaterials.map(mat => (
                  <div key={mat.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 border border-gray-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen size={14} className="text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{mat.title}</span>
                    </div>
                    <button
                      onClick={() => handleParse(mat.id)}
                      disabled={parsingId === mat.id}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-theme/20 rounded-lg text-[10px] text-theme hover:bg-theme/30 transition-colors disabled:opacity-50"
                    >
                      {parsingId === mat.id ? (
                        <><Loader2 size={10} className="animate-spin" /> 解析中</>
                      ) : (
                        <><Sparkles size={10} /> 解析</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
              <Brain size={14} className="text-theme" />
              已解析知识点
            </h2>
            {parsedMaterials.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无解析结果</p>
            ) : (
              <div className="space-y-2">
                {parsedMaterials.map(mat => (
                  <div key={mat.id} className="bg-surface rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedMaterial(expandedMaterial === mat.id ? null : mat.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen size={14} className="text-theme shrink-0" />
                        <span className="text-xs font-medium text-gray-900 truncate">{mat.title}</span>
                        <span className="shrink-0 px-1.5 py-0.5 bg-theme/20 rounded text-[10px] text-theme">
                          {mat.parsedContent!.knowledgePoints.length} 个知识点
                        </span>
                      </div>
                      {expandedMaterial === mat.id ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                    </button>

                    {expandedMaterial === mat.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-3 pb-3 space-y-3"
                      >
                        <div className="bg-theme/10 rounded-lg p-3 border border-theme/20">
                          <p className="text-[10px] text-theme font-medium mb-1">内容总结</p>
                          <p className="text-xs text-gray-700">{mat.parsedContent!.summary}</p>
                        </div>

                        <div className="space-y-2">
                          {mat.parsedContent!.knowledgePoints.map(kp => {
                            const imp = importanceLabel(kp.importance)
                            return (
                              <div key={kp.id} className="bg-gray-50 rounded-lg p-2.5">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${imp.color}`}>
                                    {imp.text}
                                  </span>
                                  <span className="text-xs font-medium text-gray-900">{kp.title}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-relaxed">{kp.content}</p>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧 - AI智能答疑 */}
        <div className="shrink-0 w-80">
          <div className="sticky top-24 bg-surface rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-theme" />
              AI智能答疑
            </h2>

            {selectedCourseId && (
              <div className="mb-3">
                <select
                  value={selectedMaterialId || ''}
                  onChange={e => setSelectedMaterialId(e.target.value || null)}
                  className="w-full bg-white rounded-lg px-3 py-2 text-xs text-gray-900 border border-gray-300 focus:border-theme outline-none"
                >
                  <option value="">基于全部课件内容</option>
                  {materials.filter(m => m.parsedContent).map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="输入你的问题..."
                className="flex-1 bg-white rounded-lg px-3 py-2 text-xs text-gray-900 border border-gray-300 focus:border-theme outline-none"
              />
              <button
                onClick={handleAsk}
                disabled={isAsking || !question.trim()}
                className="shrink-0 px-3 py-2 bg-theme text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>

            {answer && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 bg-theme/10 rounded-lg p-3 border border-theme/20"
              >
                <p className="text-xs text-gray-700 leading-relaxed">{answer}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
