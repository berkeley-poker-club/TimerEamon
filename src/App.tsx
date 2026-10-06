import ControlView from './views/ControlView'
import DisplayView from './views/DisplayView'

export default function App() {
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'control' ? <ControlView /> : <DisplayView />
}
