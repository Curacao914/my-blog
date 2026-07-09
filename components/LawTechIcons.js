
const paths = {
  content: <><rect x='4' y='3' width='16' height='18' rx='3' /><path d='M8 8h8M8 12h8M8 16h5' /></>,
  archive: <><path d='M5 4h14v4H5z' /><path d='M7 8v12h10V8' /><path d='M10 12h4' /></>,
  random: <><path d='M16 3h5v5' /><path d='M4 20 20 4' /><path d='M21 16v5h-5' /><path d='M15 15l5 5' /><path d='M4 4l5 5' /></>,
  tools: <><path d='M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z' /></>,
  about: <><circle cx='12' cy='8' r='4' /><path d='M4 21a8 8 0 0 1 16 0' /></>,
  desk: <><rect x='3' y='4' width='18' height='16' rx='3' /><path d='M8 9h8M8 13h5M9 20l-1 2M15 20l1 2' /></>,
  search: <><circle cx='11' cy='11' r='6' /><path d='m16 16 5 5' /></>,
  spark: <><path d='m12 2 1.3 4.7L18 8l-4.7 1.3L12 14l-1.3-4.7L6 8l4.7-1.3z' /><path d='m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z' /></>,
  home: <><path d='m3 11 9-8 9 8' /><path d='M5 10v11h14V10M9 21v-7h6v7' /></>,
  menu: <><path d='M4 7h16M4 12h16M4 17h16' /></>
}

export function LawTechIcon({ name, size = 18, className = '' }) {
  return (
    <svg
      aria-hidden='true'
      className={className}
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {paths[name] || paths.spark}
    </svg>
  )
}
