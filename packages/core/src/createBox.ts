import { system } from '@xstyled/system'

export function createBox() {
  return [`&&{`, system, `}`]
}
createBox.meta = system.meta
