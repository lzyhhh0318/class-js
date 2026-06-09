import { cn } from '@/lib/utils'

// 空状态组件
export default function Empty() {
  return (
    <div className={cn('flex h-full items-center justify-center')}>暂无内容</div>
  )
}
