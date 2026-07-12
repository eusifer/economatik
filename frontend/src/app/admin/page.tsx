'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Cpu, Server, Laptop, Archive, BarChart2, Save, 
  Users, UserPlus, Edit2, Check, X, Shield, Key,
  Download, RefreshCw
} from 'lucide-react';

const AGENCIAS_CMACTACNA = [
  "OFICINA PRINCIPAL",
  "AGENCIA CIUDAD NUEVA",
  "AGENCIA ALTO DE LA ALIANZA",
  "AGENCIA CORONEL MENDOZA",
  "AGENCIA GREGORIO ALBARRACIN",
  "AGENCIA BUSTAMANTE Y RIVERO",
  "AGENCIA PUERTO MALDONADO",
  "AGENCIA MARCAVALLE",
  "AGENCIA CUSCO CENTRAL",
  "AGENCIA LAZO",
  "AGENCIA SAN MARTIN",
  "AGENCIA LEON VELARDE",
  "AGENCIA CAYMA",
  "AGENCIA HUEPETUHE",
  "AGENCIA ILAVE",
  "AGENCIA MAZUKO",
  "AGENCIA LA NEGRITA",
  "AGENCIA ATE",
  "AGENCIA EL PEDREGAL",
  "AGENCIA HIGUERETA",
  "AGENCIA SAN JUAN",
  "AGENCIA JULIACA",
  "AGENCIA ILO",
  "AGENCIA PUNO CENTRAL",
  "AGENCIA ICA CENTRAL",
  "AGENCIA LA VICTORIA",
  "AGENCIA DESAGUADERO",
  "AGENCIA MOQUEGUA CENTRAL",
  "AGENCIA IBERIA",
  "AGENCIA CERRO COLORADO",
  "AGENCIA TUPAC AMARU"
];

export default function AdminPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  // Nuevos Estados de Usuarios
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userUsername, setUserUsername] = useState('');
  const [userNombreCompleto, setUserNombreCompleto] = useState('');
  const [userRol, setUserRol] = useState<'administrador' | 'tecnico' | 'invitado'>('tecnico');
  const [userAgencias, setUserAgencias] = useState<string[]>([]);
  const [userActivo, setUserActivo] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [modalUsuarioAbierto, setModalUsuarioAbierto] = useState(false);
  const [tempPasswordGenerada, setTempPasswordGenerada] = useState<string | null>(null);

  // Estados para Informes
  const [informeNum, setInformeNum] = useState('');
  const [diagTecnico, setDiagTecnico] = useState('');
  const [sustLogistico, setSustLogistico] = useState('');
  const [serieActivoBaja, setSerieActivoBaja] = useState('');

  // Estados para Renovación
  const [serieViejo, setSerieViejo] = useState('');
  const [serieNuevo, setSerieNuevo] = useState('');

  // Estados para reportes del parque TIC y almacén
  const [totalCPUs, setTotalCPUs] = useState(0);
  const [totalLaptops, setTotalLaptops] = useState(0);
  const [totalScanners, setTotalScanners] = useState(0);
  const [totalInsumosStock, setTotalInsumosStock] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  // Estados para limpieza de base de datos
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.rol === 'administrador') {
          setIsAdmin(true);
          cargarEstadisticas();
          cargarUsuarios();
        } else {
          window.location.href = '/dashboard';
        }
      } catch (e) {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
    setCheckingAdmin(false);
  }, []);

  const cargarEstadisticas = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetStats {
              listActivosCMDB {
                numero_serie
                tipo_equipo
                marca
                modelo
                ubicacion_agencia
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                unidad_medida
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data) {
        const activos = data.data.listActivosCMDB || [];
        const insumos = data.data.listInsumos || [];

        let cpus = 0;
        let laptops = 0;
        let scanners = 0;

        activos.forEach((a: any) => {
          const tipo = (a.tipo_equipo || '').toLowerCase();
          if (tipo.includes('cpu') || tipo.includes('workstation') || tipo.includes('pc')) {
            cpus++;
          } else if (tipo.includes('laptop') || tipo.includes('portatil')) {
            laptops++;
          } else if (tipo.includes('scanner') || tipo.includes('escaner')) {
            scanners++;
          }
        });

        const totalStock = insumos.reduce((acc: number, i: any) => acc + (i.cantidad_stock || 0), 0);

        setTotalCPUs(cpus);
        setTotalLaptops(laptops);
        setTotalScanners(scanners);
        setTotalInsumosStock(totalStock);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    } finally {
      setLoadingStats(false);
    }
  };




  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            query {
              listUsers {
                id
                username
                rol
                nombre_completo
                activo
                agencias
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listUsers) {
        setUsuarios(data.data.listUsers);
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const abrirModalCrearUsuario = () => {
    setUserUsername('');
    setUserNombreCompleto('');
    setUserRol('tecnico');
    setUserAgencias([]);
    setUserActivo(true);
    setEditingUserId(null);
    setTempPasswordGenerada(null);
    setModalUsuarioAbierto(true);
  };

  const abrirModalEditarUsuario = (u: any) => {
    setUserUsername(u.username);
    setUserNombreCompleto(u.nombre_completo);
    setUserRol(u.rol);
    setUserAgencias(u.agencias || []);
    setUserActivo(u.activo);
    setEditingUserId(u.id);
    setTempPasswordGenerada(null);
    setModalUsuarioAbierto(true);
  };

  const procesarGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername || !userNombreCompleto) {
      alert('Por favor complete los campos requeridos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      let query = '';
      let variables: any = {};

      if (editingUserId) {
        query = `
          mutation Editar($id: ID!, $nombre: String!, $rol: String!, $activo: Boolean!, $agencias: [String!]!) {
            updateUser(id: $id, nombreCompleto: $nombre, rol: $rol, activo: $activo, agencias: $agencias)
          }
        `;
        variables = {
          id: editingUserId,
          nombre: userNombreCompleto,
          rol: userRol,
          activo: userActivo,
          agencias: userAgencias
        };
      } else {
        query = `
          mutation Crear($username: String!, $nombre: String!, $rol: String!, $agencias: [String!]!) {
            createUser(username: $username, nombreCompleto: $nombre, rol: $rol, agencias: $agencias)
          }
        `;
        variables = {
          username: userUsername,
          nombre: userNombreCompleto,
          rol: userRol,
          agencias: userAgencias
        };
      }

      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ query, variables })
      });

      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        if (editingUserId) {
          alert('Usuario actualizado correctamente.');
          setModalUsuarioAbierto(false);
          cargarUsuarios();
        } else {
          const pass = data.data.createUser;
          setTempPasswordGenerada(pass);
          cargarUsuarios();
        }
      }
    } catch (err: any) {
      alert(`Error al guardar usuario: ${err.message}`);
    }
  };

  const alternarActivoUsuario = async (u: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation Editar($id: ID!, $nombre: String!, $rol: String!, $activo: Boolean!, $agencias: [String!]!) {
              updateUser(id: $id, nombreCompleto: $nombre, rol: $rol, activo: $activo, agencias: $agencias)
            }
          `,
          variables: {
            id: u.id,
            nombre: u.nombre_completo,
            rol: u.rol,
            activo: !u.activo,
            agencias: u.agencias
          }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        alert(`Usuario ${!u.activo ? 'activado' : 'desactivado'} correctamente.`);
        cargarUsuarios();
      }
    } catch (err: any) {
      alert(`Error al alternar estado: ${err.message}`);
    }
  };

  const restablecerContrasenaUsuario = async (u: any) => {
    if (!confirm(`¿Está seguro de que desea restablecer la contraseña de '${u.username}'? Se generará una contraseña temporal.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation Restablecer($id: ID!) {
              resetUserPassword(id: $id)
            }
          `,
          variables: { id: u.id }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        const pass = data.data.resetUserPassword;
        setTempPasswordGenerada(pass);
        setEditingUserId(null); // Evitar colisión de estados
        setModalUsuarioAbierto(true); // Desplegar el modal para mostrar la nueva contraseña
      }
    } catch (err: any) {
      alert(`Error al restablecer contraseña: ${err.message}`);
    }
  };



  const descargarExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debe iniciar una sesión simulada en el inicio para descargar el reporte.');
        return;
      }

      const res = await fetch(`${backendUrl}/api/reports/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status !== 200) {
        const errData = await res.json();
        alert(`Error: ${errData.message}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productividad_mensual.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Error al descargar el reporte Excel.');
    }
  };

  const emitirInformeBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!informeNum || !diagTecnico || !sustLogistico || !serieActivoBaja) {
      alert('Todos los campos son obligatorios para INF-BAJA.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation CrearBaja($num: String!, $diag: String!, $sust: String!, $serie: String!) {
              crearInformeBaja(
                numero_informe: $num
                diagnostico_tecnico: $diag
                sustento_logistico: $sust
                serie_activo: $serie
              )
            }
          `,
          variables: { num: informeNum, diag: diagTecnico, sust: sustLogistico, serie: serieActivoBaja }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Informe de Baja ${informeNum} emitido con éxito. La IP del activo ${serieActivoBaja} ha sido liberada.`);
        setInformeNum('');
        setDiagTecnico('');
        setSustLogistico('');
        setSerieActivoBaja('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const emitirInformeRenovacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!informeNum || !diagTecnico || !sustLogistico) {
      alert('Campos Número, Diagnóstico y Sustento son obligatorios para INF-RENOV.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation CrearRenov($num: String!, $diag: String!, $sust: String!) {
              crearInformeRenovacion(
                numero_informe: $num
                diagnostico_tecnico: $diag
                sustento_logistico: $sust
              )
            }
          `,
          variables: { num: informeNum, diag: diagTecnico, sust: sustLogistico }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Informe de Renovación ${informeNum} emitido. Pendiente de aprobación patrimonial.`);
        setInformeNum('');
        setDiagTecnico('');
        setSustLogistico('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const procesarRenovacionCPU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serieViejo || !serieNuevo) {
      alert('Ambas series son requeridas.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation RenovTech($viejo: String!, $nuevo: String!) {
              renovacionTecnologica(serieViejo: $viejo, serieNuevo: $nuevo)
            }
          `,
          variables: { viejo: serieViejo, nuevo: serieNuevo }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Renovación completada. CPU Nuevo (${serieNuevo}) heredó IP/Host del CPU Viejo (${serieViejo}). El CPU viejo fue desactivado.`);
        setSerieViejo('');
        setSerieNuevo('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSembrarDatos = async () => {
    if (!confirm('¿Desea sembrar el catálogo inicial de economato y los activos semilla en la base de datos?')) return;
    
    setSeeding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation {
              sembrarDatosIniciales
            }
          `
        })
      });
      
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else if (data.data && data.data.sembrarDatosIniciales) {
        alert('Datos semilla y catálogo de economato cargados exitosamente.');
        window.location.reload();
      } else {
        alert('No se pudo completar la siembra de datos.');
      }
    } catch (err: any) {
      alert(`Error de red al sembrar base de datos: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanDatabase = async () => {
    if (cleanConfirmText !== 'CONFIRMAR') return;
    if (!confirm('¿Está absolutamente seguro de proceder con la limpieza total de datos de prueba? Se borrará todo el historial.')) return;
    
    setCleaning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation {
              limpiarDatosPrueba
            }
          `
        })
      });
      
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else if (data.data && data.data.limpiarDatosPrueba) {
        alert('Base de datos depurada exitosamente. El sistema está listo para producción.');
        setCleanConfirmText('');
        window.location.reload();
      } else {
        alert('No se pudo completar la limpieza de datos.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar limpiar la base de datos.');
    } finally {
      setCleaning(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
        Verificando nivel de autorización...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Panel del Administrador Patrimonial</h1>
          <p className="text-sm text-slate-400 mt-1">Gestión avanzada de inventarios, reportes de auditoría y ciclos de renovación.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={descargarExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 transition rounded-lg text-sm font-bold text-white shadow-lg shadow-green-500/20"
          >
            <Download className="w-4 h-4" /> Exportar Reporte Mensual (ExcelJS)
          </button>
        </div>
      </div>

      {/* Panel de Reportes e Indicadores */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" /> Reportes e Indicadores del Parque TIC & Economato
          </h2>
          {loadingStats && <span className="text-xs text-slate-500 animate-pulse">Actualizando indicadores...</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Total CPUs */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Computadoras / CPUs</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalCPUs}</p>
            <span className="text-[10px] text-slate-500">Registrados en la CMDB</span>
          </div>

          {/* Card 2: Total Laptops */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Laptops / Portátiles</span>
              <Laptop className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalLaptops}</p>
            <span className="text-[10px] text-slate-500">Soportadas en inventario</span>
          </div>

          {/* Card 3: Total Scanners */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Escáneres / Digitalizad.</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalScanners}</p>
            <span className="text-[10px] text-slate-500">Unidades de digitalización</span>
          </div>

          {/* Card 4: Total Economato Stock */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Artículos en Economato</span>
              <Archive className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalInsumosStock}</p>
            <span className="text-[10px] text-slate-500">Suma total de repuestos/insumos</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usuarios RBAC (Izquierda) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Control de Accesos y Roles RBAC
            </h3>
            <button
              onClick={abrirModalCrearUsuario}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-650 hover:bg-blue-600 rounded-lg text-[10px] font-bold text-white transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Nuevo Usuario
            </button>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                  <th className="p-2">Usuario</th>
                  <th className="p-2">Nombre Completo</th>
                  <th className="p-2">Rol</th>
                  <th className="p-2 text-center">Estado</th>
                  <th className="p-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500 animate-pulse">Cargando cuentas...</td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">No hay usuarios registrados.</td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold text-slate-200">{u.username}</td>
                      <td className="p-2 text-slate-300">{u.nombre_completo}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${u.rol === 'administrador' ? 'bg-red-950 text-red-400 border border-red-900/40' :
                          u.rol === 'tecnico' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                          {u.rol.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${u.activo ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => abrirModalEditarUsuario(u)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => restablecerContrasenaUsuario(u)}
                            className="p-1 bg-amber-950/60 hover:bg-amber-900 text-amber-400 rounded border border-amber-900/30"
                            title="Restablecer Contraseña"
                          >
                            <Key className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => alternarActivoUsuario(u)}
                            className={`p-1 rounded text-white ${u.activo ? 'bg-rose-950 hover:bg-rose-900 text-rose-400' : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400'}`}
                            title={u.activo ? 'Desactivar' : 'Activar'}
                          >
                            {u.activo ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal de CRUD de Usuario */}
          {modalUsuarioAbierto && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-400" />
                    {editingUserId ? 'Editar Cuenta de Acceso' : 'Registrar Nueva Cuenta'}
                  </h4>
                  <button
                    onClick={() => setModalUsuarioAbierto(false)}
                    className="text-slate-400 hover:text-white text-sm font-bold"
                  >
                    &times;
                  </button>
                </div>

                {tempPasswordGenerada && (
                  <div className="p-3 bg-blue-950/30 border border-blue-900 text-blue-300 rounded-lg text-xs space-y-1">
                    <div className="font-bold">⚠️ Credencial temporal generada:</div>
                    <p>Copie la contraseña antes de cerrar este aviso. No se mostrará de nuevo.</p>
                    <div className="mt-2 bg-slate-950 p-2 rounded text-center text-sm font-mono font-bold select-all tracking-wider text-white border border-slate-850">
                      {tempPasswordGenerada}
                    </div>
                    <button
                      onClick={() => {
                        setTempPasswordGenerada(null);
                        setModalUsuarioAbierto(false);
                        cargarUsuarios();
                      }}
                      className="w-full mt-2 py-1 bg-blue-650 hover:bg-blue-600 text-white rounded text-[10px] font-bold"
                    >
                      Entendido y Copiado
                    </button>
                  </div>
                )}

                {!tempPasswordGenerada && (
                  <form onSubmit={procesarGuardarUsuario} className="space-y-3 text-left text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold">Usuario de Red (Login) *</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingUserId}
                        placeholder="ej. jsmith"
                        value={userUsername}
                        onChange={(e) => setUserUsername(e.target.value.toLowerCase())}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="ej. John Smith Valencia"
                        value={userNombreCompleto}
                        onChange={(e) => setUserNombreCompleto(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold">Rol del Sistema *</label>
                      <select
                        value={userRol}
                        onChange={(e) => setUserRol(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="tecnico">Técnico de Campo</option>
                        <option value="administrador">Administrador Patrimonial</option>
                        <option value="invitado">Invitado (Solo Lectura)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold">Agencias a Cargo *</label>
                      <div className="max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1.5">
                        {AGENCIAS_CMACTACNA.map((ag) => {
                          const isChecked = userAgencias.includes(ag);
                          return (
                            <label key={ag} className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer hover:text-white transition">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setUserAgencias(userAgencias.filter((a) => a !== ag));
                                  } else {
                                    setUserAgencias([...userAgencias, ag]);
                                  }
                                }}
                                className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500"
                              />
                              {ag}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-500">Seleccione las sedes de la CMAC Tacna bajo su jurisdicción.</p>
                    </div>

                    {editingUserId && (
                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="user-activo-chk"
                          checked={userActivo}
                          onChange={(e) => setUserActivo(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="user-activo-chk" className="text-[10px] text-slate-300 font-semibold cursor-pointer">
                          Cuenta de acceso habilitada (Activo)
                        </label>
                      </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setModalUsuarioAbierto(false)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-blue-650 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Renovación de CPU (Derecha) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" /> Renovación Tecnológica (Reuso CPU)
          </h2>
          <p className="text-xs text-slate-400">El nuevo CPU hereda las credenciales de red (IP/Host) del equipo viejo. El equipo viejo limpia sus propiedades y pasa a estado temporal "En Almacén".</p>

          <form onSubmit={procesarRenovacionCPU} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="viejo-cpu" className="text-sm font-semibold text-slate-300">Serie del CPU Viejo (A retirar)</label>
              <input
                id="viejo-cpu"
                type="text"
                placeholder="ej. CPU-5542"
                value={serieViejo}
                onChange={(e) => setSerieViejo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="nuevo-cpu" className="text-sm font-semibold text-slate-300">Serie del CPU Nuevo (A instalar)</label>
              <input
                id="nuevo-cpu"
                type="text"
                placeholder="ej. CPU-9988"
                value={serieNuevo}
                onChange={(e) => setSerieNuevo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 transition rounded-lg text-sm font-bold text-white"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" /> Aplicar Transición de Red (IP/Host)
            </button>
          </form>
        </div>
      </div>

      {/* Emisión de Informes Técnicos */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" /> Emisión de Informes Técnicos de Activos
        </h2>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Datos Generales */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="num-informe" className="text-sm font-semibold text-slate-300">Número de Informe *</label>
              <input
                id="num-informe"
                type="text"
                placeholder="ej. INF-BAJA-2026-001 o INF-RENOV-2026-002"
                value={informeNum}
                onChange={(e) => setInformeNum(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="diag-tec" className="text-sm font-semibold text-slate-300">Diagnóstico Técnico del Equipo *</label>
              <textarea
                id="diag-tec"
                rows={3}
                placeholder="Describa el estado físico, depreciación y vida útil restante del bien..."
                value={diagTecnico}
                onChange={(e) => setDiagTecnico(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="sust-log" className="text-sm font-semibold text-slate-300">Sustento Logístico *</label>
              <textarea
                id="sust-log"
                rows={3}
                placeholder="Describa el sustento logístico y el destino final de las piezas de recambio..."
                value={sustLogistico}
                onChange={(e) => setSustLogistico(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Acciones de Emisión */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Opción para Baja */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-red-400">Módulo INF-BAJA (Definitivo)</h3>
                <p className="text-xs text-slate-500 mt-1">Este informe da de baja total al hardware y **libera su IP/Host de red de manera instantánea**.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="baja-serie" className="text-sm font-semibold text-slate-300">Serie del Activo a Dar de Baja</label>
                <input
                  id="baja-serie"
                  type="text"
                  placeholder="ej. KOD-3021"
                  value={serieActivoBaja}
                  onChange={(e) => setSerieActivoBaja(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="button"
                onClick={emitirInformeBaja}
                className="w-full py-2 bg-red-750 hover:bg-red-700 transition rounded-lg text-xs font-bold text-white"
              >
                Emitir INF-BAJA & Liberar IP
              </button>
            </div>

            {/* Opción para Renovación */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 space-y-2">
              <h3 className="text-sm font-bold text-blue-400">Módulo INF-RENOV (Reutilización Ligera)</h3>
              <p className="text-xs text-slate-500">Este informe registra la re-asignación. Requiere aprobación administrativa antes de habilitarse de nuevo.</p>

              <button
                type="button"
                onClick={emitirInformeRenovacion}
                className="w-full py-2 bg-blue-750 hover:bg-blue-700 transition rounded-lg text-xs font-bold text-white mt-2"
              >
                Emitir INF-RENOV para Aprobación
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Sección Carga de Catálogo Inicial y Datos Semilla */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-blue-400 flex items-center gap-2">
          📥 Carga de Catálogo Inicial y Datos Semilla
        </h2>
        <p className="text-xs text-slate-400">
          Esta acción poblará la base de datos vacía cargando de manera dinámica el catálogo maestro institucional de insumos y repuestos del Economato (`CATALOGO_ECONOMATO.xlsx`) y registrará los activos semilla de hardware de la CMDB.
        </p>

        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-xs text-blue-300">
              Presione el botón para sincronizar el catálogo de economato inicial desde el archivo local en el servidor.
            </div>
            
            <button
              type="button"
              onClick={handleSembrarDatos}
              disabled={seeding}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-900/20"
            >
              {seeding ? 'Cargando Semillas...' : 'Cargar Catálogo Inicial'}
            </button>
          </div>
        </div>
      </section>

      {/* Sección Limpieza de Base de Datos para Producción */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
          ⚠️ Limpieza de Base de Datos (Puesta en Producción)
        </h2>
        <p className="text-xs text-slate-400">
          Esta acción **eliminará permanentemente todos los registros de prueba** de la base de datos (Tickets, Incidencias, Custodias del Economato, Historiales, Kardex de Activos y de Insumos). Mantendrá únicamente la cuenta activa del Administrador (`admin`) para permitir la carga y el registro de la información real del inventario corporativo.
        </p>

        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-4">
          <div className="text-xs text-red-400 font-bold">
            ¡ADVERTENCIA! Esta operación no se puede deshacer. Por motivos de seguridad, escriba la palabra <span className="underline font-mono text-white select-all">CONFIRMAR</span> para proceder.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-3">
              <input
                type="text"
                placeholder="Escriba CONFIRMAR aquí..."
                value={cleanConfirmText}
                onChange={(e) => setCleanConfirmText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
            
            <button
              type="button"
              onClick={handleCleanDatabase}
              disabled={cleanConfirmText !== 'CONFIRMAR' || cleaning}
              className="w-full py-2.5 bg-red-750 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 transition rounded-lg text-xs font-bold text-white shadow-lg shadow-red-900/20"
            >
              {cleaning ? 'Limpiando...' : 'Iniciar Limpieza'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
