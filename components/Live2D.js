/* eslint-disable no-undef */
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useEffect, useRef } from 'react'

/**
 * 动态签名挂件
 * @returns
 */
export default function Live2D() {
  const { theme, switchTheme } = useGlobal()
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const petSwitchTheme = siteConfig('WIDGET_PET_SWITCH_THEME')
  
  const svgRef = useRef(null)
  const animTimeoutRef = useRef(null)

  useEffect(() => {
    if (showPet) {
      initDynamicSignature()
    }
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [theme, showPet])

  function handleClick() {
    if (petSwitchTheme) {
      switchTheme()
    }
  }

  function initDynamicSignature() {
    const wrapper = svgRef.current
    if (!wrapper) return

    const paths = Array.from(wrapper.querySelectorAll('path.sig-anim-path'))
    if (paths.length === 0) return

    const pathLengths = new Map()
    const pathDurations = new Map()

    paths.forEach((path) => {
      const length = path.getTotalLength()
      pathLengths.set(path, length)
      pathDurations.set(path, parseInt(path.getAttribute('data-duration') || 600))

      path.style.strokeDasharray = `${length} ${length}`
      path.style.strokeDashoffset = length
      path.style.transition = 'none'
      path.style.opacity = '1'
    })

    wrapper.getBoundingClientRect()

    const drawAll = (callback) => {
      let accumulatedDelay = 0

      paths.forEach((path, index) => {
        const duration = pathDurations.get(path)

        let easing = 'linear'
        if (index === 0) easing = 'ease-in-out'
        else if (index === paths.length - 1) easing = 'ease-out'

        path.style.transition = `stroke-dashoffset ${duration}ms ${easing} ${accumulatedDelay}ms`
        path.style.strokeDashoffset = '0'

        accumulatedDelay += duration
        // C 画完后稍微停顿 200ms，为后面的“极速狂飙”蓄力
        if (index === 0) accumulatedDelay += 200 
      })

      if (callback) animTimeoutRef.current = setTimeout(callback, accumulatedDelay)
    }

    const rollbackAll = (callback) => {
      let accumulatedDelay = 0

      for (let i = paths.length - 1; i >= 0; i--) {
        const path = paths[i]
        // 倒退的速度也相应加快，不拖泥带水
        const duration = pathDurations.get(path) * 0.5

        let easing = 'linear'
        if (i === paths.length - 1) easing = 'ease-in-out'
        else if (i === 0) easing = 'ease-out'

        path.style.transition = `stroke-dashoffset ${duration}ms ${easing} ${accumulatedDelay}ms`
        path.style.strokeDashoffset = pathLengths.get(path)

        accumulatedDelay += duration
      }

      if (callback) animTimeoutRef.current = setTimeout(callback, accumulatedDelay)
    }

    const runLoop = () => {
      drawAll(() => {
        animTimeoutRef.current = setTimeout(() => {
          rollbackAll(() => {
            animTimeoutRef.current = setTimeout(runLoop, 1000)
          })
        }, 2500)
      })
    }

    animTimeoutRef.current = setTimeout(runLoop, 500)
  }

  if (!showPet) {
    return <></>
  }

  return (
    <>
      <style jsx global>{`
        .sig-component-wrapper {
          width: 100%;
          cursor: grab;
          user-select: none; 
        }

        .sig-component-wrapper:active {
          cursor: grabbing;
        }

        .sig-svg-box {
          width: 100%;
          height: auto;
          display: block;
          margin: 0;
          padding: 0;
        }

        .sig-anim-path {
          fill: none;
          stroke: #000000;
          stroke-width: 20;
          stroke-linecap: round;
          stroke-linejoin: round;
          will-change: stroke-dashoffset;
        }
      `}</style>

      <div 
        className="sig-component-wrapper" 
        onClick={handleClick}
      >
        <svg 
          className="sig-svg-box" 
          viewBox="0 5 2367 800" 
          xmlns="http://www.w3.org/2000/svg"
          ref={svgRef}
        >
          {/* 第一笔：C (400ms，接近原版的干净利落) */}
          <path className="sig-anim-path" data-duration="400" d="M490.008 182.172C352.008 304.172 324.008 494.172 550.508 249.672C743.008 5.67258 612.508 -55.8274 412.507 82.6723C270.508 201.173 121.008 312.173 26.5076 590.173C-67.9924 868.173 258.508 784.173 616.508 393.173" />
          
          {/* 后续连笔：总共压缩到 650ms，一气呵成！ */}
          <path className="sig-anim-path" data-duration="250" d="M617.008 393.173C302.508 873.673 654.507 556.673 769.008 386.673C474.508 860.173 844.508 545.673 899.508 415.173C928.008 373.006 979.108 288.773 955.508 289.173C926.008 289.673 873.008 353.673 899.508 386.673C926.008 419.673 1023.84 339.262 927.008 504.673C822.508 683.173 920.508 665.173 1025.01 536.673C1092.67 455.673 1234.91 317.973 1262.51 415.173C1228.51 311.673 1080.51 480.673 1073.01 508.673C949.008 790.673 1241.01 458.173 1295.51 377.673C1199.51 508.673 1108.51 804.173 1379.51 484.173C1401.82 455.96 1431.75 430.358 1460.75 411.173" />
          <path className="sig-anim-path" data-duration="50" d="M1460.75 411.173C1532.47 363.714 1598.44 355.514 1529.01 444.173C1562.67 401.506 1596.14 335.173 1460.75 411.173Z" />
          <path className="sig-anim-path" data-duration="100" d="M1460.75 411.173C1244.51 678.673 1408.51 686.673 1606.51 508.673C1627.25 484.455 1656.62 453.92 1686.65 429.173" />
          <path className="sig-anim-path" data-duration="50" d="M1686.65 429.173C1737.23 387.499 1789.69 362.234 1806.01 411.173C1800.94 387.173 1769.97 357.173 1686.65 429.173Z" />
          <path className="sig-anim-path" data-duration="200" d="M1686.65 429.173C1460.75 730.673 1670.01 610.173 1756.51 484.173C1781.34 456.673 1832.91 396.873 1840.51 377.673C1850.01 353.673 1750.75 563.203 1749.01 575.673C1732.01 697.673 1883.01 536.673 1903.51 503.673C1932.51 479.006 1992.21 424.473 1999.01 403.673C2007.51 377.673 1936.51 483.673 1928.01 503.673C1919.51 523.673 1878.01 710.173 2017.51 566.173C2157.01 422.173 2090.01 312.173 2017.51 386.173C1945.01 460.173 2058.11 481.272 2121.01 451.673C2189.01 419.673 2345.51 396.673 2356.01 429.173" />
        </svg>
      </div>
    </>
  )
}
