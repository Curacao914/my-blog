import {
  partitionScheduleRows
} from '@/lib/server/supabase'

describe('schedule row batching', () => {
  it('separates existing rows from new rows for PostgREST', () => {
    const result = partitionScheduleRows([
      { id: 'existing', title: '旧文章' },
      { title: '新文件夹' },
      { id: 'existing-2', title: '旧文件夹' }
    ])
    expect(result.existingRows).toHaveLength(2)
    expect(result.newRows).toEqual([{ title: '新文件夹' }])
  })
})
