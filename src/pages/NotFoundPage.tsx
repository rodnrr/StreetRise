import { Link } from 'react-router-dom'
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <p className="text-6xl mb-4">🗺️</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-500 mb-6">This page doesn't exist or has moved.</p>
      <Link to="/map" className="btn-primary">Back to Map</Link>
    </div>
  )
}
