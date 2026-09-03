const React = require('react')

function ReactMarkdownMock({ children, components = {} }) {
  const Wrapper = components.p || 'div'
  return React.createElement(Wrapper, { 'data-testid': 'markdown-preview' }, children)
}

module.exports = ReactMarkdownMock
module.exports.default = ReactMarkdownMock
