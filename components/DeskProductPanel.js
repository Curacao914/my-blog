import Link from 'next/link'
import { LawTechIcon } from '@/components/LawTechIcons'

export function DeskProductPanel({ icon, eyebrow, title, description, primary, secondary, stats = [], cards = [] }) {
  return (
    <div className='desk-product-panel'>
      <section className='desk-product-hero'>
        <div className='desk-product-orb' aria-hidden='true'><LawTechIcon name={icon} size={34} /></div>
        <div className='desk-product-copy'>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className='desk-product-actions'>
            {primary ? <Link className='soft-button primary' href={primary.href}>{primary.label}</Link> : null}
            {secondary ? <Link className='soft-button' href={secondary.href}>{secondary.label}</Link> : null}
          </div>
        </div>
        {stats.length ? <dl className='desk-product-stats'>{stats.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
      </section>
      <section className='desk-product-grid'>
        {cards.map(card => (
          <article key={card.title} className={`desk-product-card tone-${card.tone || 'leaf'}`}>
            <span className='desk-product-card-icon'><LawTechIcon name={card.icon || icon} size={20} /></span>
            <div><h3>{card.title}</h3><p>{card.body}</p></div>
            {card.meta ? <small>{card.meta}</small> : null}
          </article>
        ))}
      </section>
    </div>
  )
}
