import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@renderer/components/layout/AppLayout'
import { DashboardPage } from '@renderer/pages/DashboardPage'
import { SettingsPage } from '@renderer/pages/SettingsPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
