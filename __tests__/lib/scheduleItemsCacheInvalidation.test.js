describe('schedule items cache invalidation', () => {
  beforeEach(() => {
    jest.resetModules()
    window.localStorage.clear()
  })

  it('removes the persisted cache for one profile', async () => {
    const cache = await import('@/lib/client/scheduleItemsCache')
    cache.writeScheduleItemsCache('profile-1', [{ id: 'one' }])
    expect(window.localStorage.getItem(cache.scheduleItemsStorageKey('profile-1'))).not.toBeNull()
    cache.clearScheduleItemsCache('profile-1')
    expect(window.localStorage.getItem(cache.scheduleItemsStorageKey('profile-1'))).toBeNull()
    expect(cache.readScheduleItemsCache('profile-1')).toBeNull()
  })

  it('removes all persisted schedule caches without touching other storage', async () => {
    const cache = await import('@/lib/client/scheduleItemsCache')
    cache.writeScheduleItemsCache('profile-1', [{ id: 'one' }])
    cache.writeScheduleItemsCache('profile-2', [{ id: 'two' }])
    window.localStorage.setItem('unrelated', 'keep')
    cache.clearScheduleItemsCache()
    expect(window.localStorage.getItem(cache.scheduleItemsStorageKey('profile-1'))).toBeNull()
    expect(window.localStorage.getItem(cache.scheduleItemsStorageKey('profile-2'))).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('keep')
  })
})
