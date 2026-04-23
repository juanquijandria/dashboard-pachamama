import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { CheckCircle2, Zap, TrendingUp, Image as ImageIcon } from 'lucide-react';

const asesoresListaOriginal = [
  'Adrian Emir Flores Cossio',
  'Brunella Sanchez Velasco',
  'Segundo Adelmo Gutierrez Barrios',
  'Andrea Antuane Valerio Moreno',
  'Fátima Lucia Abad Rios',
  'Jhon Bryan Pullo Perales',
  'Vanessa Albornoz Moncada'
];

const Ventas = () => {
  const [datos, setDatos] = useState([]);
  const [asesoresDb, setAsesoresDb] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const contenedorRef = useRef(null);
  
  const [nuevaVenta, setNuevaVenta] = useState({
    asesor: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  useEffect(() => {
    const cargarAsesores = async () => {
      try {
        const { data } = await supabase.from('asesores').select('*');
        setAsesoresDb(data && data.length > 0 ? data : asesoresListaOriginal.map((nombre, i) => ({ id: `fallback-id-${i}`, nombre })));
      } catch (e) {
        setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({ id: `fallback-id-${i}`, nombre })));
      }
    };
    cargarAsesores();
  }, []);

  useEffect(() => {
    const cargarVentas = async () => {
      if (asesoresDb.length === 0) return;
      setCargando(true);
      try {
        // Filtrar por el mes actual o simplemente traer las últimas
        const { data, error } = await supabase
          .from('ventas')
          .select(`id, fecha_venta, asesores (nombre)`)
          .order('fecha_venta', { ascending: false })
          .limit(100);
          
        if (data && !error) {
          setDatos(data.map(item => ({
            id: item.id,
            asesor: item.asesores?.nombre || 'Desconocido',
            fecha_venta: item.fecha_venta
          })));
        }
      } catch (e) {
        console.log('Operando localmente');
      } finally {
        setCargando(false);
      }
    };
    cargarVentas();
  }, [asesoresDb]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!nuevaVenta.asesor) {
      setMensaje({ tipo: 'error', texto: 'El Asesor es obligatorio.' });
      return;
    }

    const asesorBd = asesoresDb.find(a => a.nombre === nuevaVenta.asesor);
    const fechaHora = new Date(`${nuevaVenta.fecha}T${nuevaVenta.hora}:00`).toISOString();
    
    const nueva = {
      asesor_id: asesorBd && !asesorBd.id.includes('fallback') ? asesorBd.id : null,
      fecha_venta: fechaHora,
      cliente_nombre: 'Cliente Rápido' // Según schema
    };

    setCargando(true);
    try {
      if (nueva.asesor_id) {
        const { data, error } = await supabase.from('ventas').insert([nueva]).select('id');
        if (error) throw error;
        setDatos([{ id: data[0].id, asesor: nuevaVenta.asesor, fecha_venta: fechaHora }, ...datos]);
      } else {
        setDatos([{ id: `temp-${Date.now()}`, asesor: nuevaVenta.asesor, fecha_venta: fechaHora }, ...datos]);
      }
      setMensaje({ tipo: 'success', texto: '¡Venta registrada exitosamente!' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al registrar venta.' });
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 2000); // 2 segs para el form rápido
    }
  };

  // Agrupar ventas por día
  const ventasPorDia = datos.reduce((acc, current) => {
    const dia = current.fecha_venta.split('T')[0];
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(current);
    return acc;
  }, {});

  const copiarImagen = async () => {
    if (contenedorRef.current) {
      try {
        const canvas = await html2canvas(contenedorRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setMensaje({ tipo: 'success', texto: '¡Imagen copiada al portapapeles!' });
          } catch (err) {
            setMensaje({ tipo: 'error', texto: 'No se pudo copiar la imagen.' });
          }
        });
      } catch (err) {
        setMensaje({ tipo: 'error', texto: 'Error al generar la imagen.' });
      }
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto bg-gray-50 p-4 rounded-xl" ref={contenedorRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-pachamama-green" />
            Módulo de Ventas
          </h2>
          <p className="text-sm text-gray-500">Registro ultrarrápido de cierres comerciales.</p>
        </div>
        <button 
          onClick={copiarImagen}
          className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Copiar Imagen
        </button>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-md flex items-center ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <CheckCircle2 className="h-5 w-5 mr-2" /> {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Ultra Rápido */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 self-start sticky top-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center text-pachamama-earth">
            <Zap className="h-5 w-5 mr-2" />
            Registro Exprés
          </h3>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asesor del Cierre</label>
              <select 
                required value={nuevaVenta.asesor} onChange={e => setNuevaVenta({...nuevaVenta, asesor: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-3 border bg-gray-50 font-medium"
              >
                <option value="">Seleccione Asesor...</option>
                {asesoresListaOriginal.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input 
                  type="date" required value={nuevaVenta.fecha} onChange={e => setNuevaVenta({...nuevaVenta, fecha: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input 
                  type="time" required value={nuevaVenta.hora} onChange={e => setNuevaVenta({...nuevaVenta, hora: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" 
                />
              </div>
            </div>
            <div className="pt-2">
              <button 
                type="submit" disabled={cargando} 
                className="w-full bg-pachamama-green text-white px-4 py-3 rounded-md hover:bg-green-700 transition font-bold shadow-md flex justify-center items-center"
              >
                ¡Registrar Venta!
              </button>
            </div>
          </form>
        </div>

        {/* Registro Diario */}
        <div className="lg:col-span-2 space-y-6">
          {Object.keys(ventasPorDia).length === 0 ? (
            <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
              Aún no hay ventas registradas.
            </div>
          ) : (
            Object.keys(ventasPorDia).sort((a,b) => new Date(b) - new Date(a)).map(dia => (
              <div key={dia} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-pachamama-earth/10 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-bold text-pachamama-earth capitalize">
                    {format(new Date(dia + 'T12:00:00'), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </h4>
                  <span className="bg-pachamama-earth text-white px-3 py-1 rounded-full text-xs font-bold">
                    {ventasPorDia[dia].length} Cierres
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {ventasPorDia[dia].sort((a,b) => new Date(b.fecha_venta) - new Date(a.fecha_venta)).map(venta => (
                    <li key={venta.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-pachamama-green/20 flex items-center justify-center text-pachamama-green font-bold mr-4">
                        {venta.asesor.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{venta.asesor}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(venta.fecha_venta), "HH:mm")} hrs
                        </p>
                      </div>
                      <div className="text-pachamama-green">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Ventas;
