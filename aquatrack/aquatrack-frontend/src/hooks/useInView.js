import { useEffect, useRef, useState } from 'react'

/**
 * Fires `visible = true` once the referenced element scrolls into the
 * viewport (used to trigger the fade/slide-in entrance animations).
 * Disconnects after firing once — elements don't re-animate on scroll-back.
 */
export function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}
