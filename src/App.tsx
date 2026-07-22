import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { TabBar } from "./components/TabBar";
import { Spinner } from "./components/ui";
import Invite from "./screens/Invite";
import Login from "./screens/Login";
import Home from "./screens/Home";
import Placas from "./screens/Placas";
import Chat from "./screens/Chat";
import ChatRoom from "./screens/ChatRoom";
import Guia from "./screens/Guia";
import Asistente from "./screens/Asistente";
import Clientes from "./screens/Clientes";
import AdminHome from "./screens/admin/AdminHome";
import AdminAvisos from "./screens/admin/AdminAvisos";
import AdminVendedores from "./screens/admin/AdminVendedores";
import AdminPlacas from "./screens/admin/AdminPlacas";
import AdminKB from "./screens/admin/AdminKB";

export default function App() {
  const { session, profile, loading } = useAuth();
  const { pathname } = useLocation();
  const publica = pathname.startsWith("/invite/") || pathname === "/login";

  if (loading) return <Spinner />;
  if (!session && !publica) return <Navigate to="/login" replace />;
  if (session && !profile && !publica) return <Spinner />;
  if (session && profile && !profile.active && !publica) {
    return (
      <div className="pantalla-plena" style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 44 }}>🔒</div>
          <h1 className="display" style={{ fontSize: 30 }}>Tu cuenta está pausada</h1>
          <p style={{ color: "var(--color-ink-soft)" }}>Hablá con tu líder para reactivarla.</p>
        </div>
      </div>
    );
  }

  const conTabs = session && profile?.active && !publica && !pathname.startsWith("/chat/") && pathname !== "/asistente";

  return (
    <>
      <Routes>
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/placas" element={<Placas />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:channelId" element={<ChatRoom />} />
        <Route path="/guia" element={<Guia />} />
        <Route path="/guia/:slug" element={<Guia />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/equipo" element={<AdminHome />} />
        <Route path="/equipo/avisos" element={<AdminAvisos />} />
        <Route path="/equipo/vendedores" element={<AdminVendedores />} />
        <Route path="/equipo/placas" element={<AdminPlacas />} />
        <Route path="/equipo/guia" element={<AdminKB />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {conTabs && <TabBar />}
    </>
  );
}
