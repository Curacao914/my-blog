const paths = {
  today: <><path d='M8 2v3M16 2v3M3.5 9h17'/><rect x='3' y='4.5' width='18' height='16' rx='3'/><path d='m8 14 2.1 2.1L16 10.8'/></>,
  inbox: <><path d='M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z'/><path d='M8 8h8M8 12h8M8 16h5'/></>,
  reading: <><path d='M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5z'/><path d='M20 5.5A2.5 2.5 0 0 0 17.5 3H14v18a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5z'/></>,
  knowledge: <><path d='M8 3h7l4 4v14H8z'/><path d='M15 3v5h5M11 12h5M11 16h5'/><circle cx='4' cy='8' r='1.5'/><circle cx='4' cy='16' r='1.5'/><path d='M5.5 8H8M5.5 16H8M4 9.5v5'/></>,
  tasks: <><rect x='3' y='4' width='18' height='16' rx='3'/><path d='M8 2v4M16 2v4M7.5 11h9M7.5 15h6'/></>,
  courses: <><path d='m3 7 9-4 9 4-9 4z'/><path d='m6 9.5 6 2.7 6-2.7V16l-6 3-6-3z'/></>,
  materials: <><path d='M7 3h8l4 4v14H7z'/><path d='M15 3v5h5M4 7v14h10'/></>,
  writing: <><path d='m14.5 4.5 5 5L9 20H4v-5z'/><path d='m12.5 6.5 5 5'/></>,
  publish: <><path d='M12 3v12M7 8l5-5 5 5'/><path d='M5 13v7h14v-7'/></>,
  system: <><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.22.4.35.84.4 1.3H21v4h-1.2c-.05.46-.18.9-.4 1.3z'/></>,
  home: <><path d='m3 11 9-8 9 8'/><path d='M5 10v11h14V10M9 21v-7h6v7'/></>,
  content: <><rect x='4' y='3' width='16' height='18' rx='3'/><path d='M8 8h8M8 12h8M8 16h5'/></>,
  archive: <><path d='M5 4h14v4H5z'/><path d='M7 8v12h10V8'/><path d='M10 12h4'/></>,
  random: <><path d='M16 3h5v5'/><path d='M4 20 20 4'/><path d='M21 16v5h-5'/><path d='M15 15l5 5'/><path d='M4 4l5 5'/></>,
  tools: <><path d='M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z'/></>,
  about: <><circle cx='12' cy='8' r='4'/><path d='M4 21a8 8 0 0 1 16 0'/></>,
  desk: <><rect x='3' y='4' width='18' height='16' rx='3'/><path d='M8 9h8M8 13h5M9 20l-1 2M15 20l1 2'/></>,
  search: <><circle cx='11' cy='11' r='6'/><path d='m16 16 5 5'/></>,
  menu: <><path d='M4 7h16M4 12h16M4 17h16'/></>,
  collapse: <><path d='m14 6-6 6 6 6'/></>,
  expand: <><path d='m10 6 6 6-6 6'/></>,
  spark: <><path d='m12 2 1.3 4.7L18 8l-4.7 1.3L12 14l-1.3-4.7L6 8l4.7-1.3z'/><path d='m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'/></>,
  atlas: <><circle cx='12' cy='12' r='2.5'/><circle cx='5' cy='6' r='2'/><circle cx='19' cy='6' r='2'/><circle cx='5' cy='18' r='2'/><circle cx='19' cy='18' r='2'/><path d='m7 7 3.2 3.2M17 7l-3.2 3.2M7 17l3.2-3.2M17 17l-3.2-3.2'/></>,
  folder: <><path d='M3.5 6.5h6l2 2H20.5v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'/><path d='M3.5 9h17'/></>,
  scan: <><path d='M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3'/><path d='M7 12h10M8 9h8M8 15h6'/></>,
  citation: <><path d='M7 8h4v4H8.5A3.5 3.5 0 0 1 5 15.5V17'/><path d='M17 8h2v4h-2.5a3.5 3.5 0 0 1-3.5 3.5V17'/></>,
  case: <><rect x='3' y='7' width='18' height='13' rx='3'/><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2'/></>,
  table: <><rect x='3' y='4' width='18' height='16' rx='2'/><path d='M3 9h18M3 14h18M9 4v16M15 4v16'/></>
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
