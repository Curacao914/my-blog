import { render, screen, waitFor } from '@testing-library/react'
import LazyImage from '@/components/LazyImage'

let observerCallback
const observe = jest.fn()
const unobserve = jest.fn()
const disconnect = jest.fn()
const mockIntersectionObserver = jest.fn(callback => {
  observerCallback = callback
  return { observe, unobserve, disconnect }
})

class MockImage {
  set src(value) {
    this._src = value
    setTimeout(() => this.onload?.(), 0)
  }

  get src() {
    return this._src
  }
}

describe('LazyImage Component', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image'
  }
  const RealImage = global.Image

  beforeAll(() => {
    window.IntersectionObserver = mockIntersectionObserver
    global.IntersectionObserver = mockIntersectionObserver
    global.Image = MockImage
  })

  afterAll(() => {
    global.Image = RealImage
  })

  beforeEach(() => {
    observerCallback = null
    mockIntersectionObserver.mockClear()
    observe.mockClear()
    unobserve.mockClear()
    disconnect.mockClear()
  })

  it('renders with required props', () => {
    render(<LazyImage {...defaultProps} />)
    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('alt', 'Test image')
  })

  it('applies custom className', () => {
    render(<LazyImage {...defaultProps} className='custom-image-class' />)
    expect(screen.getByAltText('Test image')).toHaveClass('custom-image-class')
  })

  it('sets width and height attributes', () => {
    render(<LazyImage {...defaultProps} width={300} height={200} />)
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('width', '300')
    expect(image).toHaveAttribute('height', '200')
  })

  it('handles priority loading without an observer', async () => {
    render(<LazyImage {...defaultProps} priority />)
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'eager')
    expect(mockIntersectionObserver).not.toHaveBeenCalled()
    await waitFor(() => expect(image).toHaveAttribute('src', '/test-image.jpg'))
  })

  it('uses lazy loading and observes the rendered image by default', () => {
    render(<LazyImage {...defaultProps} />)
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenCalledWith(image)
  })

  it('loads the real source after the image intersects', async () => {
    render(<LazyImage {...defaultProps} />)
    const image = screen.getByAltText('Test image')
    observerCallback([{ isIntersecting: true, target: image }])
    await waitFor(() => expect(image).toHaveAttribute('src', '/test-image.jpg'))
    expect(unobserve).toHaveBeenCalledWith(image)
  })

  it('calls onLoad only when the real image has loaded', async () => {
    const handleLoad = jest.fn()
    render(<LazyImage {...defaultProps} priority onLoad={handleLoad} />)
    await waitFor(() => expect(handleLoad).toHaveBeenCalledTimes(1))
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<LazyImage {...defaultProps} onClick={handleClick} />)
    screen.getByAltText('Test image').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('handles error gracefully', () => {
    render(<LazyImage {...defaultProps} />)
    const image = screen.getByAltText('Test image')
    image.dispatchEvent(new Event('error'))
    expect(image).toBeInTheDocument()
  })

  it('applies the async decoding attribute and custom styles', () => {
    render(<LazyImage {...defaultProps} style={{ border: '1px solid red' }} />)
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveStyle('border: 1px solid red')
  })

  it('renders nothing when src is missing', () => {
    render(<LazyImage alt='Test image' />)
    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument()
  })
})
