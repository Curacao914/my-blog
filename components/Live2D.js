import { DynamicSignature } from '@/components/law-tech/DynamicSignature'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'

/**
 * Legacy theme slot for the animated Curacao signature.
 */
export default function Live2D() {
  const { switchTheme } = useGlobal()
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const petSwitchTheme = siteConfig('WIDGET_PET_SWITCH_THEME')

  if (!showPet) return null

  return <DynamicSignature
    className='legacy-signature-widget'
    onClick={petSwitchTheme ? switchTheme : undefined}
  />
}
