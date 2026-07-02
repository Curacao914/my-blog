import {
  clearScheduleItemsCache,
  fetchScheduleItems,
  readScheduleItemsCache
} from '@/lib/client/scheduleItemsCache'

function response(items) {
  return {
    ok: true,
    json: () => Promise.resolve({ items })
  }
}

describe('schedule items cache lifecycle', () => {
  beforeEach(() => {
    clearScheduleItemsCache()
    window.localStorage.clear()
    global.fetch = jest.fn()
  })

  it('does not let an invalidated older request overwrite a newer result', async () => {
    let resolveOld
    let resolveNew
    fetch
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve }))

    const oldRequest = fetchScheduleItems('profile-1', { force: true })
    clearScheduleItemsCache('profile-1')
    const newRequest = fetchScheduleItems('profile-1', { force: true })

    resolveNew(response([{ id: 'new' }]))
    await newRequest
    resolveOld(response([{ id: 'old' }]))
    await oldRequest

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(readScheduleItemsCache('profile-1')).toEqual([{ id: 'new' }])
  })
})
