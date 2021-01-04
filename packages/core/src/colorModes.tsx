/* eslint-disable react/no-danger */
/* eslint-env browser */
import * as React from 'react'
import {
  toCustomPropertiesDeclarations,
  toCustomPropertiesReferences,
} from './customProperties'

type Mode = string | null
type ColorModeState = [Mode, (mode: Mode) => void]

const STORAGE_KEY = 'xstyled-color-mode'

const isLocalStorageAvailable =
  typeof window !== 'undefined' &&
  (() => {
    try {
      const STORAGE_TEST_KEY = `${STORAGE_KEY}-test`
      window.localStorage.setItem(STORAGE_TEST_KEY, STORAGE_TEST_KEY)
      window.localStorage.removeItem(STORAGE_TEST_KEY)
      return true
    } catch (err) {
      return false
    }
  })()

const storage = isLocalStorageAvailable
  ? {
      get: () => window.localStorage.getItem(STORAGE_KEY),
      set: (value: string) => window.localStorage.setItem(STORAGE_KEY, value),
      clear: () => window.localStorage.removeItem(STORAGE_KEY),
    }
  : {
      get: () => null,
      set: () => {},
      clear: () => {},
    }

const COLOR_MODE_CLASS_PREFIX = 'xstyled-color-mode-'
const getColorModeClassName = (mode: string) =>
  `${COLOR_MODE_CLASS_PREFIX}${mode}`

const XSTYLED_COLORS_PREFIX = 'xstyled-colors'
const SYSTEM_MODES = ['light', 'dark']

interface Theme {
  useCustomProperties?: boolean
  useColorSchemeMediaQuery?: boolean
  initialColorModeName?: string
  defaultColorModeName?: string
  colors?: {
    modes?: {
      [key: string]: any
    }
  }
}

interface ModeTheme extends Theme {
  colors: {
    modes: {
      [key: string]: any
    }
  }
}

function getModeTheme(theme: ModeTheme, mode: string) {
  return {
    ...theme,
    colors: { ...theme.colors, ...theme.colors.modes[mode] },
  }
}

const getMediaQuery = (query: string) => `@media ${query}`
const getColorModeQuery = (mode: string) => `(prefers-color-scheme: ${mode})`

function hasColorModes(theme: Theme): theme is ModeTheme {
  return Boolean(theme && theme.colors && theme.colors.modes)
}

function hasCustomPropertiesEnabled(theme: Theme) {
  return (
    theme &&
    (theme.useCustomProperties === undefined || theme.useCustomProperties)
  )
}

function hasMediaQueryEnabled(theme: Theme) {
  return (
    theme &&
    (theme.useColorSchemeMediaQuery === undefined ||
      theme.useColorSchemeMediaQuery)
  )
}

function getInitialColorModeName(theme: Theme) {
  return theme.initialColorModeName || 'default'
}

function getDefaultColorModeName(theme: Theme) {
  return theme.defaultColorModeName || getInitialColorModeName(theme)
}

export function createColorStyles(
  theme: Theme,
  { targetSelector = 'body' } = {},
) {
  if (!hasColorModes(theme)) return null
  const { modes, ...colors } = theme.colors
  let styles = toCustomPropertiesDeclarations(
    colors,
    XSTYLED_COLORS_PREFIX,
    theme,
  )

  function getModePropertiesDeclarations(mode: string) {
    const modeTheme = getModeTheme(theme as ModeTheme, mode)
    const { modes, ...colors } = modeTheme.colors
    return toCustomPropertiesDeclarations(
      { ...colors, ...modes[mode] },
      XSTYLED_COLORS_PREFIX,
      modeTheme,
    )
  }

  if (theme.useColorSchemeMediaQuery !== false) {
    SYSTEM_MODES.forEach((mode) => {
      if (modes[mode]) {
        const mediaQuery = getMediaQuery(getColorModeQuery(mode))
        styles += `${mediaQuery}{${getModePropertiesDeclarations(mode)}}`
      }
    })
  }

  const initialModeName = getInitialColorModeName(theme)
  ;[initialModeName, ...Object.keys(modes)].forEach((mode) => {
    const key = `&.${getColorModeClassName(mode)}`
    styles += `${key}{${getModePropertiesDeclarations(mode)}}`
  })

  return `${targetSelector}{${styles}}`
}

function getSystemModeMql(mode: string) {
  if (typeof window === 'undefined' || window.matchMedia === undefined) {
    return null
  }
  const query = getColorModeQuery(mode)
  return window.matchMedia(query)
}

function useSystemMode(theme: ModeTheme) {
  const configs: { mode: string; mql: MediaQueryList }[] = React.useMemo(() => {
    if (!hasMediaQueryEnabled(theme)) return []
    return SYSTEM_MODES.map((mode) => {
      if (!theme.colors.modes[mode]) return null
      const mql = getSystemModeMql(mode)
      return mql ? { mode, mql } : null
    }).filter(Boolean) as { mode: string; mql: MediaQueryList }[]
  }, [theme])

  const [systemMode, setSystemMode] = React.useState(() => {
    const config = configs.find((config) => config.mql.matches)
    return config ? config.mode : null
  })

  React.useEffect(() => {
    const cleans = configs
      .filter(({ mql }) => mql.addEventListener && mql.removeEventListener)
      .map(({ mode, mql }) => {
        const handler = ({ matches }: MediaQueryListEvent) => {
          if (matches) {
            setSystemMode(mode)
          } else {
            setSystemMode((previousMode) =>
              previousMode === mode ? null : mode,
            )
          }
        }
        mql.addEventListener('change', handler)
        return () => mql.removeEventListener('change', handler)
      })
    return () => cleans.forEach((clean) => clean())
  })

  return systemMode
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

export function useColorModeState(
  theme: ModeTheme,
  { target }: { target?: Element } = {},
): ColorModeState {
  const systemMode = useSystemMode(theme)
  const defaultColorMode = getDefaultColorModeName(theme)
  const initialColorMode = getInitialColorModeName(theme)
  const [mode, setMode] = React.useState(() => {
    if (!hasColorModes(theme)) return null
    return defaultColorMode
  })

  // Add mode className
  const customPropertiesEnabled = hasCustomPropertiesEnabled(theme)

  const manualSetRef = React.useRef(false)
  const manuallySetMode = React.useCallback((value) => {
    manualSetRef.current = true
    setMode(value)
  }, [])

  // Set initial color mode in lazy
  useIsomorphicLayoutEffect(() => {
    if (!hasColorModes(theme)) return
    const storedMode = storage.get()
    const initialMode = storedMode || systemMode || defaultColorMode
    if (mode !== initialMode) {
      setMode(storedMode || systemMode || defaultColorMode)
    }
  }, [])

  // Store mode preference
  useIsomorphicLayoutEffect(() => {
    if (manualSetRef.current) {
      if (mode) {
        storage.set(mode)
      } else {
        storage.clear()
      }
    }
  }, [mode])

  // Sync system mode
  useIsomorphicLayoutEffect(() => {
    const storedMode = storage.get()
    if (storedMode) return
    const targetMode = systemMode || defaultColorMode
    if (targetMode === mode) return
    setMode(targetMode)
  }, [mode, systemMode, defaultColorMode])

  // Add and remove class names
  useIsomorphicLayoutEffect(() => {
    if (!mode) return undefined
    if (!customPropertiesEnabled) return undefined
    const stored = storage.get()
    const initial = initialColorMode !== mode
    if (!stored && !initial) return undefined
    const className = getColorModeClassName(mode)
    const usedTarget = target || document.body
    usedTarget.classList.add(className)
    return () => {
      usedTarget.classList.remove(className)
    }
  }, [customPropertiesEnabled, target, mode, initialColorMode])

  return [mode, manuallySetMode]
}

export function useColorModeTheme(theme: any, mode: Mode) {
  const customPropertiesTheme = React.useMemo(() => {
    if (!mode) return null
    if (!hasCustomPropertiesEnabled(theme)) return null
    if (!hasColorModes(theme)) return theme

    const { modes, ...colors } = theme.colors
    return {
      ...theme,
      colors: {
        ...toCustomPropertiesReferences(colors, XSTYLED_COLORS_PREFIX, theme),
        modes,
      },
      __rawColors: theme.colors,
    }
  }, [theme])

  const swapModeTheme = React.useMemo(() => {
    if (!mode) return null
    if (hasCustomPropertiesEnabled(theme)) return null
    if (!hasColorModes(theme)) return theme

    if (mode === getInitialColorModeName(theme)) {
      return { ...theme, __colorMode: mode }
    }

    return {
      ...theme,
      colors: {
        ...theme.colors,
        ...theme.colors.modes[mode],
      },
      __colorMode: mode,
      __rawColors: theme.colors,
    }
  }, [theme, mode])

  return customPropertiesTheme || swapModeTheme
}

export const ColorModeContext = React.createContext<ColorModeState | null>(null)

export function useColorMode() {
  const colorModeState = React.useContext(ColorModeContext)

  if (!colorModeState) {
    throw new Error(`[useColorMode] requires the ColorModeProvider component`)
  }

  return colorModeState
}

export function createColorModeProvider({
  ThemeContext,
  ThemeProvider,
  ColorModeStyle,
}: {
  ThemeContext: React.Context<any>
  ThemeProvider: React.ComponentType<any>
  ColorModeStyle: React.ComponentType<any>
}) {
  function ColorModeProvider({
    children,
    target,
    targetSelector,
  }: {
    children: React.ReactNode
    target?: Element
    targetSelector?: string
  }) {
    const theme = React.useContext(ThemeContext)
    if (!theme) {
      throw new Error(
        '[ColorModeProvider] requires ThemeProvider upper in the tree',
      )
    }
    const colorState = useColorModeState(theme, { target })
    const colorModeTheme = useColorModeTheme(theme, colorState[0])
    return (
      <>
        <ColorModeStyle targetSelector={targetSelector} />
        <ThemeProvider theme={colorModeTheme}>
          <ColorModeContext.Provider value={colorState}>
            {children}
          </ColorModeContext.Provider>
        </ThemeProvider>
      </>
    )
  }
  return ColorModeProvider
}

interface GetInitScriptOptions {
  target?: string
}

function getInitScript({
  target = 'document.body',
}: GetInitScriptOptions = {}) {
  return `(function() { try {
    var mode = localStorage.getItem('${STORAGE_KEY}');
    if (mode) ${target}.classList.add('${COLOR_MODE_CLASS_PREFIX}' + mode);
  } catch (e) {} })();`
}

export function getColorModeInitScriptElement(options?: GetInitScriptOptions) {
  return (
    <script
      key="xstyled-color-mode-init"
      dangerouslySetInnerHTML={{ __html: getInitScript(options) }}
    />
  )
}

export function getColorModeInitScriptTag(options?: GetInitScriptOptions) {
  return `<script>${getInitScript(options)}</script>`
}
