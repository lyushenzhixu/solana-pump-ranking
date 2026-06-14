// Allow importing plain CSS files (e.g. globals.css in root layout)
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
