const React = require('react')

function passthrough(name) {
  return function ThemeComponentMock({ children, ...props }) {
    return React.createElement('div', { ...props, 'data-theme-component': name }, children)
  }
}

module.exports = new Proxy({}, {
  get(_target, property) {
    if (property === '__esModule') return true
    if (property === 'default') return passthrough('default')
    return passthrough(String(property))
  }
})
