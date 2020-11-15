import * as CSS from 'csstype'
import { style, compose } from '../style'
import { getColor, ColorGetter } from './basics'
import { SystemProperty } from '../types'

export interface BackgroundProps<T = {}> {
  background?: SystemProperty<CSS.Property.Background, T>
}
export const background = style<BackgroundProps>({
  prop: 'background',
})

type BackgroundColor<T = {}> = ColorGetter<T> | CSS.Property.BackgroundColor
export interface BackgroundColorProps<T = {}> {
  backgroundColor?: SystemProperty<BackgroundColor, T>
  bg?: SystemProperty<BackgroundColor, T>
}
export const backgroundColor = style<BackgroundColorProps>({
  prop: ['backgroundColor', 'bg'],
  cssProperty: 'backgroundColor',
  themeGet: getColor,
})

export interface BackgroundImageProps<T = {}> {
  backgroundImage?: SystemProperty<CSS.Property.BackgroundImage, T>
}
export const backgroundImage = style<BackgroundImageProps>({
  prop: 'backgroundImage',
})

export interface BackgroundSizeProps<T = {}> {
  backgroundSize?: SystemProperty<CSS.Property.BackgroundSize, T>
}
export const backgroundSize = style<BackgroundSizeProps>({
  prop: 'backgroundSize',
})

export interface BackgroundPositionProps<T = {}> {
  backgroundPosition?: SystemProperty<CSS.Property.BackgroundPosition, T>
}
export const backgroundPosition = style<BackgroundPositionProps>({
  prop: 'backgroundPosition',
})

export interface BackgroundRepeatProps<T = {}> {
  backgroundRepeat?: SystemProperty<CSS.Property.BackgroundRepeat, T>
}
export const backgroundRepeat = style<BackgroundRepeatProps>({
  prop: 'backgroundRepeat',
})

export type BackgroundsProps<T = {}> = BackgroundProps<T> &
  BackgroundColorProps<T> &
  BackgroundImageProps<T> &
  BackgroundSizeProps<T> &
  BackgroundPositionProps<T> &
  BackgroundRepeatProps<T>
export const backgrounds = compose<BackgroundsProps>(
  background,
  backgroundColor,
  backgroundImage,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
)
