import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Search, Plus, Trash2, CheckCircle2, FileText, User } from 'lucide-react';

const asesoresListaOriginal = [
  'Adrian Emir Flores Cossio',
  'Brunella Sanchez Velasco',
  'Segundo Adelmo Gutierrez Barrios',
  'Andrea Antuane Valerio Moreno',
  'Fátima Lucia Abad Rios',
  'Jhon Bryan Pullo Perales',
  'Vanessa Albornoz Moncada'
];

const Cotizaciones = () => {
  const [datos, setDatos] = useState([]);
  const [asesoresDb, setAsesoresDb] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [busqueda, setBusqueda] = useState('');
  
  const [nuevaCotizacion, setNuevaCotizacion] = useState({
    asesor: '',
    cliente: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  useEffect(() => {
    const cargarAsesores = async () => {
      try {
        const { data, error } = await supabase.from('asesores').select('*');
        if (data && data.length > 0 && !error) {
          setAsesoresDb(data);
        } else {
          setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({ id: `fallback-id-${i}`, nombre })));
        }
      } catch (e) {
        setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({ id: `fallback-id-${i}`, nombre })));
      }
    };
    cargarAsesores();
  }, []);

  useEffect(() => {
    const cargarCotizaciones = async () => {
      if (asesoresDb.length === 0) return;
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('cotizaciones')
          .select(`id, cliente_nombre, fecha_emision, estado, asesores (nombre)`)
          .order('fecha_emision', { ascending: false });
          
        if (data && !error) {
          setDatos(data.map(item => ({
            id: item.id,
            asesor: item.asesores?.nombre || 'Desconocido',
            cliente_nombre: item.cliente_nombre,
            fecha_emision: item.fecha_emision,
            estado: item.estado
          })));
        }
      } catch (e) {
        console.log('Operando localmente');
      } finally {
        setCargando(false);
      }
    };
    cargarCotizaciones();
  }, [asesoresDb]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!nuevaCotizacion.asesor || !nuevaCotizacion.cliente) {
      setMensaje({ tipo: 'error', texto: 'Asesor y Cliente son obligatorios.' });
      return;
    }

    const asesorBd = asesoresDb.find(a => a.nombre === nuevaCotizacion.asesor);
    const fechaHora = new Date(`${nuevaCotizacion.fecha}T${nuevaCotizacion.hora}:00`).toISOString();
    
    const nueva = {
      asesor_id: asesorBd && !asesorBd.id.includes('fallback') ? asesorBd.id : null,
      cliente_nombre: nuevaCotizacion.cliente,
      fecha_emision: fechaHora,
      estado: 'Emitida',
      monto: 0
    };

    setCargando(true);
    try {
      if (nueva.asesor_id) {
        const { data, error } = await supabase.from('cotizaciones').insert([nueva]).select('id');
        if (error) throw error;
        setDatos([{
          id: data[0].id, asesor: nuevaCotizacion.asesor, cliente_nombre: nueva.cliente_nombre, fecha_emision: fechaHora, estado: nueva.estado
        }, ...datos]);
      } else {
        // Fallback local
        setDatos([{
          id: `temp-${Date.now()}`, asesor: nuevaCotizacion.asesor, cliente_nombre: nueva.cliente_nombre, fecha_emision: fechaHora, estado: nueva.estado
        }, ...datos]);
      }
      setMensaje({ tipo: 'success', texto: 'Cotización agregada exitosamente.' });
      setNuevaCotizacion({ ...nuevaCotizacion, cliente: '' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al agregar cotización.' });
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cotización?')) return;
    
    setCargando(true);
    try {
      if (!id.toString().startsWith('temp-')) {
        const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
        if (error) throw error;
      }
      setDatos(datos.filter(d => d.id !== id));
      setMensaje({ tipo: 'success', texto: 'Cotización eliminada.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar.' });
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const datosFiltrados = datos.filter(d => 
    d.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Módulo de Cotizaciones</h2>
        <p className="text-sm text-gray-500">Gestión de cotizaciones emitidas a clientes.</p>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-md flex items-center ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          <CheckCircle2 className="h-5 w-5 mr-2" /> {mensaje.texto}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center">
          <Plus className="h-5 w-5 mr-2 text-pachamama-green" />
          Nueva Cotización
        </h3>
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input 
              type="text" placeholder="Nombre completo" required
              value={nuevaCotizacion.cliente} onChange={e => setNuevaCotizacion({...nuevaCotizacion, cliente: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asesor Responsable</label>
            <select 
              required value={nuevaCotizacion.asesor} onChange={e => setNuevaCotizacion({...nuevaCotizacion, asesor: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border"
            >
              <option value="">Seleccione...</option>
              {asesoresListaOriginal.map((a, i) => <option key={i} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input 
              type="date" required value={nuevaCotizacion.fecha} onChange={e => setNuevaCotizacion({...nuevaCotizacion, fecha: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input 
              type="time" required value={nuevaCotizacion.hora} onChange={e => setNuevaCotizacion({...nuevaCotizacion, hora: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" 
            />
          </div>
          <div className="lg:col-span-5 flex justify-end mt-2">
            <button type="submit" disabled={cargando} className="bg-pachamama-green text-white px-6 py-2 rounded-md hover:bg-green-700 transition font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2" /> Emitir Cotización
            </button>
          </div>
        </form>
      </div>

      {/* Buscador y Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 block w-full shadow-sm focus:ring-pachamama-green sm:text-sm border-gray-300 rounded-md p-3 border bg-gray-50"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {datosFiltrados.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">No hay registros de cotizaciones.</td></tr>
              ) : (
                datosFiltrados.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-pachamama-earth mr-2" />
                        <div className="text-sm font-medium text-gray-900">{row.cliente_nombre}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.asesor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(row.fecha_emision), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEliminar(row.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="Borrar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Cotizaciones;
