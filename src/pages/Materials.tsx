import { useEffect, useState, useRef } from 'react'
import { useCourseStore, type Material, type MaterialType, type MaterialCategory } from '@/store/course'
import {
  FileText, FileUp, Download, Eye, Clock, Trash2,
  ChevronDown, X, Upload, Video, File, BookOpen, Radio,
  Image as ImageIcon, Archive
} from 'lucide-react'

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  ppt: <BookOpen size={20} className="text-orange-400" />,
  pdf: <FileText size={20} className="text-red-400" />,
  word: <File size={20} className="text-blue-400" />,
  video: <Video size={20} className="text-purple-400" />,
  image: <ImageIcon size={20} className="text-green-400" />,
  archive: <Archive size={20} className="text-yellow-400" />,
}

const TYPE_LABELS: Record<MaterialType, string> = {
  ppt: 'PPT', pdf: 'PDF', word: 'Word', video: '视频', image: '图片', archive: '压缩包',
}

const CATEGORY_TABS: { key: MaterialCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'courseware', label: '课件', icon: <BookOpen size={16} /> },
  { key: 'recording', label: '直播录像', icon: <Radio size={16} /> },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getPreviewSrc(material: Material): string {
  const filePath = material.versions?.[material.versions.length - 1]?.filePath || ''
  return filePath && filePath.startsWith('http')
    ? `/api/materials/preview?url=${encodeURIComponent(filePath)}`
    : filePath
}

export default function Materials() {
  const currentUser = useCourseStore((state) => state.currentUser)
  const courses = useCourseStore((state) => state.courses)
  const storeMaterials = useCourseStore((state) => state.materials)
  const selectedCourseId = useCourseStore((state) => state.selectedCourseId)
  const selectedChapterId = useCourseStore((state) => state.selectedChapterId)
  const isLoading = useCourseStore((state) => state.isLoading)
  
  // 所有 action 函数都通过 getState() 获取，避免订阅导致的不必要重新渲染
  const storeActions = useCourseStore.getState()
  const setSelectedCourse = storeActions.setSelectedCourse
  const setSelectedChapter = storeActions.setSelectedChapter
  const uploadMaterial = storeActions.uploadMaterial
  const downloadMaterial = storeActions.downloadMaterial
  const revertVersion = storeActions.revertVersion
  const parseMaterial = storeActions.parseMaterial

  // 本地删除ID集合 - 不更新store，避免触发连锁反应
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  // 过滤掉已删除的材料
  const materials = storeMaterials.filter(m => !deletedIds.has(m.id))

  // 直播录像列表（从视频API获取）
  const [videoResources, setVideoResources] = useState<any[]>([])

  const activeCategory = useCourseStore((s) => s.materialCategory) || 'courseware'
  const setActiveCategory = (cat: MaterialCategory) => {
    useCourseStore.setState({ materialCategory: cat })
  }
  const [showUpload, setShowUpload] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [showVersions, setShowVersions] = useState<string | null>(null)
  const [parsingId, setParsingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 使用 ref 存储 store 方法，避免 useEffect 依赖问题
  const storeRef = useRef(useCourseStore.getState())

  useEffect(() => {
    storeRef.current.fetchCourses()
  }, [])

  useEffect(() => {
    if (activeCategory === 'courseware') {
      storeRef.current.fetchMaterials(selectedCourseId || undefined, selectedChapterId || undefined, activeCategory)
    } else {
      // 直播录像：从视频API获取
      const fetchVideos = async () => {
        try {
          const res = await fetch(`/api/video/resources?courseId=${selectedCourseId || 'default'}`)
          const data = await res.json()
          if (data.success) {
            setVideoResources(data.data || [])
          }
        } catch {}
      }
      fetchVideos()
    }
    // 切换筛选时清空删除记录
    setDeletedIds(new Set())
  }, [selectedCourseId, selectedChapterId, activeCategory])

  const selectedCourse = courses.find(c => c.id === selectedCourseId)
  const canUpload = currentUser?.role === 'teacher' || currentUser?.role === 'admin'
  const canDelete = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCourseId, setUploadCourseId] = useState('')
  const [uploadChapterId, setUploadChapterId] = useState('')
  const [uploadVisibility, setUploadVisibility] = useState('course')
  const [uploadDescription, setUploadDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const COURSEWARE_FORMATS = ['.ppt', '.pptx', '.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']
  const RECORDING_FORMATS = ['.mp4', '.avi', '.mov', '.mkv']
  const MAX_FILE_SIZE = 500 * 1024 * 1024

  const allowedFormats = activeCategory === 'courseware' ? COURSEWARE_FORMATS : RECORDING_FORMATS

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setUploadError('')
    if (file) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedFormats.includes(ext)) {
        setUploadError(`不支持的文件格式: ${ext}，允许格式: ${allowedFormats.join(', ')}`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`文件大小超过限制（最大 ${formatSize(MAX_FILE_SIZE)}）`)
        return
      }
    }
  }

  const handleUploadClick = async () => {
    if (!uploadTitle.trim()) { setUploadError('请填写标题'); return }
    const courseId = uploadCourseId || selectedCourseId
    if (!courseId) { setUploadError('请选择课程'); return }
    if (!selectedFile) { setUploadError('请选择文件'); return }
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    if (!allowedFormats.includes(ext)) { setUploadError(`不支持的文件格式: ${ext}`); return }
    if (selectedFile.size > MAX_FILE_SIZE) { setUploadError(`文件大小超过限制`); return }

    setUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', uploadTitle.trim())
    formData.append('courseId', courseId)
    if (uploadChapterId || selectedChapterId) formData.append('chapterId', uploadChapterId || selectedChapterId || '')
    formData.append('visibility', uploadVisibility)
    formData.append('description', uploadDescription)
    if (currentUser) formData.append('userId', currentUser.id)
    formData.append('category', activeCategory)

    try {
      const result = await uploadMaterial(formData)
      if (result) {
        setShowUpload(false)
        setUploadTitle(''); setUploadCourseId(''); setUploadChapterId('')
        setUploadVisibility('course'); setUploadDescription('')
        setSelectedFile(null); setUploadError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setUploadError('上传失败，请重试')
      }
    } catch (err) {
      setUploadError('上传失败：' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleParse = async (materialId: string) => {
    setParsingId(materialId)
    await parseMaterial(materialId)
    setParsingId(null)
  }

  // 删除：只更新本地 deletedIds，不更新 Zustand store
  const handleDelete = (matId: string) => {
    if (!confirm('确认删除？')) return
    // 本地标记为已删除
    setDeletedIds(prev => {
      const next = new Set(prev)
      next.add(matId)
      return next
    })
    // 关闭预览
    if (previewMaterial?.id === matId) {
      setPreviewMaterial(null)
    }
    // 后台静默调用API删除
    fetch(`/api/materials/materials/${matId}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">课程资料</h1>
        <div className="flex gap-1 mt-2 bg-gray-100 rounded-lg p-0.5">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                activeCategory === tab.key ? 'bg-theme text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedCourseId ? 'bg-theme text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >全部</button>
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCourseId === c.id ? 'bg-theme text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >{c.name}</button>
          ))}
        </div>
        {selectedCourse?.chapters && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedChapter(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                !selectedChapterId ? 'bg-gray-300 text-gray-900' : 'bg-gray-100 text-gray-500'
              }`}
            >全部章节</button>
            {selectedCourse.chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChapter(ch.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                  selectedChapterId === ch.id ? 'bg-gray-300 text-gray-900' : 'bg-gray-100 text-gray-500'
                }`}
              >{ch.name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">
            {activeCategory === 'courseware' ? `${materials.length} 个课件` : `${videoResources.length} 个录像`}
          </span>
          {canUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-theme text-white rounded-full text-xs font-medium"
            >
              <Upload size={14} />
              {activeCategory === 'courseware' ? '上传课件' : '上传录像'}
            </button>
          )}
        </div>

        {activeCategory === 'courseware' ? (
          isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-theme border-t-transparent rounded-full animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <BookOpen size={48} className="mx-auto mb-3 opacity-30" /><p className="text-sm">暂无课件</p><p className="text-[10px] text-gray-400 mt-1">支持上传 PPT / PDF / Word / 图片格式</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map(mat => (
                <div key={mat.id} className="bg-surface rounded-xl p-3 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {TYPE_ICONS[mat.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{mat.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{mat.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={10} />{formatDate(mat.updatedAt)}</span>
                        <span>v{mat.currentVersion}</span>
                        <span>{formatSize(mat.versions[mat.versions.length - 1]?.fileSize || 0)}</span>
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">{TYPE_LABELS[mat.type]}</span>
                        {mat.parsedContent && <span className="px-1.5 py-0.5 bg-theme/20 rounded text-theme">已解析</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
                    {mat.type !== 'archive' && (
                      <button onClick={() => setPreviewMaterial(mat)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:text-gray-900 transition-colors">
                        <Eye size={12} />预览
                      </button>
                    )}
                    <button onClick={() => downloadMaterial(mat.id)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:text-gray-900 transition-colors">
                      <Download size={12} />下载
                    </button>
                    {mat.type !== 'video' && mat.type !== 'archive' && mat.type !== 'image' && (
                      <button onClick={() => handleParse(mat.id)} disabled={parsingId === mat.id} className="flex items-center gap-1 px-2.5 py-1 bg-theme/20 rounded-lg text-xs text-theme hover:bg-theme/30 transition-colors disabled:opacity-50">
                        {parsingId === mat.id ? <><div className="w-3 h-3 border border-theme border-t-transparent rounded-full animate-spin" />解析中</> : <><FileUp size={12} />AI解析</>}
                      </button>
                    )}
                    {mat.versions.length > 1 && (
                      <button onClick={() => setShowVersions(showVersions === mat.id ? null : mat.id)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:text-gray-900 transition-colors">
                        <ChevronDown size={12} />版本({mat.versions.length})
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(mat.id)} className="ml-auto p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {showVersions === mat.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1.5">
                      {mat.versions.slice().reverse().map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${v.version === mat.currentVersion ? 'bg-theme' : 'bg-gray-400'}`} />
                            <span className="text-gray-700">v{v.version}</span>
                            <span className="text-gray-500">{v.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{formatDate(v.uploadedAt)}</span>
                            {v.version !== mat.currentVersion && <button onClick={() => revertVersion(mat.id, v.version)} className="text-theme hover:underline">回溯</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          // 直播录像列表
          videoResources.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Radio size={48} className="mx-auto mb-3 opacity-30" /><p className="text-sm">暂无直播录像</p><p className="text-[10px] text-gray-400 mt-1">教师直播录制后自动出现在这里</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videoResources.map((v: any) => (
                <div key={v.id} className="bg-surface rounded-xl p-3 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><Radio size={20} className="text-purple-400" /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{v.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={10} />{formatDate(v.createdAt)}</span>
                        <span className="px-1.5 py-0.5 bg-purple-100 rounded text-purple-600">{v.source === 'recording' ? '直播录制' : '预录视频'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
                    <button onClick={() => window.open(v.videoUrl, '_blank')} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:text-gray-900 transition-colors">
                      <Eye size={12} />播放
                    </button>
                    <a href={v.videoUrl} download className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:text-gray-900 transition-colors">
                      <Download size={12} />下载
                    </a>
                    {canDelete && (
                      <button onClick={async () => {
                        if (!confirm('确认删除？')) return
                        try {
                          await fetch('/api/video/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id }) })
                          setVideoResources(prev => prev.filter((r: any) => r.id !== v.id))
                        } catch {}
                      }} className="ml-auto p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-surface rounded-2xl p-5 border border-gray-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">{activeCategory === 'courseware' ? '上传课件' : '上传直播录像'}</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {uploadError && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600">{uploadError}</p>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{activeCategory === 'courseware' ? '课件标题 *' : '录像标题 *'}</label>
                <input value={uploadTitle} onChange={e => { setUploadTitle(e.target.value); setUploadError('') }} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:border-theme outline-none" placeholder="输入标题" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">描述</label>
                <textarea value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} rows={2} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:border-theme outline-none resize-none" placeholder="输入描述（可选）" />
              </div>
              {!selectedCourseId && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">课程 *</label>
                  <select value={uploadCourseId} onChange={e => { setUploadCourseId(e.target.value); setUploadError('') }} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:border-theme outline-none">
                    <option value="">选择课程</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">章节</label>
                <select value={uploadChapterId} onChange={e => setUploadChapterId(e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:border-theme outline-none">
                  <option value="">选择章节</option>
                  {selectedCourse?.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">可见范围</label>
                <select value={uploadVisibility} onChange={e => setUploadVisibility(e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-gray-900 border border-gray-300 focus:border-theme outline-none">
                  <option value="course">本课程可见</option>
                  <option value="public">公开</option>
                  <option value="private">仅自己</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">选择文件 *</label>
                <input ref={fileInputRef} type="file" accept={allowedFormats.join(',')} onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-theme/20 file:text-theme hover:file:bg-theme/30" />
                {selectedFile && <p className="text-[10px] text-gray-600 mt-1">已选择: {selectedFile.name} ({formatSize(selectedFile.size)})</p>}
                <p className="text-[10px] text-gray-400 mt-1">允许格式: {allowedFormats.join(', ')} · 最大 {formatSize(MAX_FILE_SIZE)}</p>
              </div>
              <button onClick={handleUploadClick} disabled={uploading} className="w-full py-2.5 bg-theme text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />上传中...</> : <><Upload size={14} />上传</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {previewMaterial && !deletedIds.has(previewMaterial.id) && (
        <div className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center p-4" onClick={() => setPreviewMaterial(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl bg-surface rounded-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 truncate pr-4">{previewMaterial.title}</h2>
              <button onClick={() => setPreviewMaterial(null)} className="text-gray-500 hover:text-gray-900 shrink-0"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-100 rounded-lg p-2.5"><span className="text-gray-500">分类</span><p className="text-gray-900 font-medium mt-0.5">{previewMaterial.category === 'recording' ? '直播录像' : '课件'}</p></div>
                <div className="bg-gray-100 rounded-lg p-2.5"><span className="text-gray-500">{previewMaterial.category === 'recording' ? '格式' : '类型'}</span><p className="text-gray-900 font-medium mt-0.5">{previewMaterial.category === 'recording' ? '视频' : TYPE_LABELS[previewMaterial.type]}</p></div>
                <div className="bg-gray-100 rounded-lg p-2.5"><span className="text-gray-500">版本</span><p className="text-gray-900 font-medium mt-0.5">v{previewMaterial.currentVersion}</p></div>
                <div className="bg-gray-100 rounded-lg p-2.5"><span className="text-gray-500">大小</span><p className="text-gray-900 font-medium mt-0.5">{formatSize(previewMaterial.versions?.[previewMaterial.versions.length - 1]?.fileSize || 0)}</p></div>
              </div>
              {previewMaterial.description && <div><h3 className="text-xs text-gray-500 mb-1">描述</h3><p className="text-sm text-gray-700">{previewMaterial.description}</p></div>}
              {previewMaterial.category === 'recording' && (
                <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/20"><Radio size={40} className="mx-auto text-purple-400 mb-2" /><p className="text-xs text-gray-700">直播录像</p><p className="text-[10px] text-gray-400 mt-1">直播功能由其他小组提供</p></div>
              )}
              {previewMaterial.category === 'courseware' && previewMaterial.type === 'pdf' && (
                <div className="bg-gray-100 rounded-xl overflow-hidden"><iframe src={getPreviewSrc(previewMaterial)} className="w-full h-96 rounded-lg" title="PDF预览" /></div>
              )}
              {previewMaterial.category === 'courseware' && (previewMaterial.type === 'ppt' || previewMaterial.type === 'word') && (
                <div className="bg-gray-100 rounded-xl p-4 text-center border border-gray-300">
                  {previewMaterial.type === 'ppt' ? <BookOpen size={40} className="mx-auto text-orange-400 mb-2" /> : <File size={40} className="mx-auto text-blue-400 mb-2" />}
                  <p className="text-xs text-gray-700 mb-3">{previewMaterial.type === 'ppt' ? 'PPT' : 'Word'} 文件可使用在线预览服务查看</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => downloadMaterial(previewMaterial.id)} className="flex items-center gap-1 px-4 py-2 bg-theme text-white rounded-lg text-xs font-medium"><Download size={14} />下载文件</button>
                    <button onClick={() => { const filePath = previewMaterial.versions?.[previewMaterial.versions.length - 1]?.filePath || ''; if (filePath) window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(filePath)}`, '_blank') }} className="flex items-center gap-1 px-4 py-2 bg-white text-theme rounded-lg text-xs font-medium border border-theme/30"><Eye size={14} />在线预览</button>
                  </div>
                </div>
              )}
              {previewMaterial.category === 'courseware' && previewMaterial.type === 'image' && (
                <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center"><img src={getPreviewSrc(previewMaterial)} className="max-w-full rounded-lg" alt={previewMaterial.title} /></div>
              )}
              {previewMaterial.category === 'courseware' && previewMaterial.type === 'archive' && (
                <div className="bg-gray-100 rounded-xl p-4 text-center border border-gray-300"><Archive size={40} className="mx-auto text-yellow-400 mb-2" /><p className="text-xs text-gray-700">压缩包文件，请下载后解压查看</p><button onClick={() => downloadMaterial(previewMaterial.id)} className="mt-3 flex items-center justify-center gap-1 mx-auto px-4 py-2 bg-theme text-white rounded-lg text-xs font-medium"><Download size={14} />下载文件</button></div>
              )}
              {previewMaterial.parsedContent && (
                <div><h3 className="text-xs text-theme font-medium mb-2">AI解析结果</h3>
                  <div className="bg-theme/10 rounded-xl p-3 border border-theme/20">
                    <p className="text-xs text-gray-700 mb-3">{previewMaterial.parsedContent.summary}</p>
                    <div className="space-y-2">{previewMaterial.parsedContent.knowledgePoints?.map?.(kp => (
                      <div key={kp.id} className="flex items-start gap-2">
                        <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${kp.importance === 'high' ? 'bg-red-400' : kp.importance === 'medium' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                        <div><p className="text-xs font-medium text-gray-900">{kp.title}</p><p className="text-[10px] text-gray-500 mt-0.5">{kp.content}</p></div>
                      </div>
                    ))}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => downloadMaterial(previewMaterial.id)} className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-theme text-white rounded-xl text-sm font-bold"><Download size={14} />下载</button>
                {previewMaterial.category === 'courseware' && previewMaterial.type !== 'video' && previewMaterial.type !== 'archive' && previewMaterial.type !== 'image' && !previewMaterial.parsedContent && (
                  <button onClick={() => handleParse(previewMaterial.id)} className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-white text-theme rounded-xl text-sm font-medium border border-theme/30"><FileUp size={14} />AI解析</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
