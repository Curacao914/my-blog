import { useEffect, useRef } from 'react'

const paths = [
  { duration: 400, d: 'M490.008 182.172C352.008 304.172 324.008 494.172 550.508 249.672C743.008 5.67258 612.508 -55.8274 412.507 82.6723C270.508 201.173 121.008 312.173 26.5076 590.173C-67.9924 868.173 258.508 784.173 616.508 393.173' },
  { duration: 250, d: 'M617.008 393.173C302.508 873.673 654.507 556.673 769.008 386.673C474.508 860.173 844.508 545.673 899.508 415.173C928.008 373.006 979.108 288.773 955.508 289.173C926.008 289.673 873.008 353.673 899.508 386.673C926.008 419.673 1023.84 339.262 927.008 504.673C822.508 683.173 920.508 665.173 1025.01 536.673C1092.67 455.673 1234.91 317.973 1262.51 415.173C1228.51 311.673 1080.51 480.673 1073.01 508.673C949.008 790.673 1241.01 458.173 1295.51 377.673C1199.51 508.673 1108.51 804.173 1379.51 484.173C1401.82 455.96 1431.75 430.358 1460.75 411.173' },
  { duration: 50, d: 'M1460.75 411.173C1532.47 363.714 1598.44 355.514 1529.01 444.173C1562.67 401.506 1596.14 335.173 1460.75 411.173Z' },
  { duration: 100, d: 'M1460.75 411.173C1244.51 678.673 1408.51 686.673 1606.51 508.673C1627.25 484.455 1656.62 453.92 1686.65 429.173' },
  { duration: 50, d: 'M1686.65 429.173C1737.23 387.499 1789.69 362.234 1806.01 411.173C1800.94 387.173 1769.97 357.173 1686.65 429.173Z' },
  { duration: 200, d: 'M1686.65 429.173C1460.75 730.673 1670.01 610.173 1756.51 484.173C1781.34 456.673 1832.91 396.873 1840.51 377.673C1850.01 353.673 1750.75 563.203 1749.01 575.673C1732.01 697.673 1883.01 536.673 1903.51 503.673C1932.51 479.006 1992.21 424.473 1999.01 403.673C2007.51 377.673 1936.51 483.673 1928.01 503.673C1919.51 523.673 1878.01 710.173 2017.51 566.173C2157.01 422.173 2090.01 312.173 2017.51 386.173C1945.01 460.173 2058.11 481.272 2121.01 451.673C2189.01 419.673 2345.51 396.673 2356.01 429.173' }
]

export function DynamicSignature({ className = '', onClick, compact = false, loop = true }) {
  const svgRef = useRef(null)
  const timersRef = useRef([])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const animatedPaths = [...svg.querySelectorAll('path')]
    const lengths = animatedPaths.map(path => path.getTotalLength())

    function clearTimers() {
      timersRef.current.forEach(timer => window.clearTimeout(timer))
      timersRef.current = []
    }

    function prepare() {
      animatedPaths.forEach((path, index) => {
        path.style.strokeDasharray = `${lengths[index]} ${lengths[index]}`
        path.style.strokeDashoffset = String(lengths[index])
        path.style.transition = 'none'
        path.style.opacity = '1'
      })
      svg.getBoundingClientRect()
    }

    function later(callback, delay) {
      const timer = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter(item => item !== timer)
        callback()
      }, delay)
      timersRef.current.push(timer)
      return timer
    }

    function run() {
      let delay = 0
      animatedPaths.forEach((path, index) => {
        const duration = paths[index].duration
        path.style.transition = `stroke-dashoffset ${duration}ms ${index === 0 ? 'ease-in-out' : 'linear'} ${delay}ms`
        path.style.strokeDashoffset = '0'
        delay += duration + (index === 0 ? 180 : 0)
      })

      if (!loop) return
      later(() => {
        let rollbackDelay = 0
        for (let index = animatedPaths.length - 1; index >= 0; index -= 1) {
          const path = animatedPaths[index]
          const duration = paths[index].duration * 0.45
          path.style.transition = `stroke-dashoffset ${duration}ms ease-out ${rollbackDelay}ms`
          path.style.strokeDashoffset = String(lengths[index])
          rollbackDelay += duration
        }
        later(run, rollbackDelay + 900)
      }, delay + 2200)
    }

    prepare()
    let observer = null
    if (typeof IntersectionObserver === 'undefined') {
      later(run, 250)
    } else {
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        observer.disconnect()
        later(run, 250)
      }, { threshold: 0.2 })
      observer.observe(svg)
    }

    return () => {
      observer?.disconnect()
      clearTimers()
    }
  }, [loop])

  function handleKeyDown(event) {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick(event)
  }

  return <div className={`dynamic-signature ${compact ? 'compact' : ''} ${className}`.trim()} onClick={onClick} onKeyDown={handleKeyDown} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
    <svg ref={svgRef} viewBox='0 5 2367 800' xmlns='http://www.w3.org/2000/svg' aria-label='Curacao 动态签名'>
      {paths.map((path, index) => <path d={path.d} key={index} />)}
    </svg>
    <style jsx>{`
      .dynamic-signature {
        width: 100%;
        color: #193b31;
        user-select: none;
      }
      .dynamic-signature[role='button'] { cursor: pointer; }
      svg { display: block; width: 100%; height: auto; overflow: visible; }
      path {
        fill: none;
        stroke: currentColor;
        stroke-width: 20;
        stroke-linecap: round;
        stroke-linejoin: round;
        will-change: stroke-dashoffset;
      }
      .compact { opacity: .88; }
      .compact path { stroke-width: 18; }
    `}</style>
  </div>
}
