import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  EyeOff, 
  Eye, 
  Image as ImageIcon, 
  Save,
  CheckCircle2,
  Trash2
} from 'lucide-react';

const asesoresListaOriginal = [
  'Adrian emir Flores Cossio',
  'Andrea antuane Valerio Moreno',
  'Brunella Sanchez Velasco',
  'Elizabeth Angelica Yataco Limon',
  'Fátima Lucia Abad Rios',
  'Jhon bryan Pullo Perales',
  'Segundo Adelmo Gutierrez Barrios',
  'Vanessa Lisett Albornoz Moncada'
];

const AvanceAsesores = () => {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [metaDiaria, setMetaDiaria] = useState(70);
  const [modoCiego, setModoCiego] = useState(false);
  const [datos, setDatos] = useState([]);
  const [asesoresDb, setAsesoresDb] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [asesoresOcultos, setAsesoresOcultos] = useState([]);
  
  const tablaRef = useRef(null);

  // Cargar lista de asesores de la BD o usar fallback
  useEffect(() => {
    const cargarAsesores = async () => {
      try {
        const { data, error } = await supabase.from('asesores').select('*');
        if (data && data.length > 0 && !error) {
          setAsesoresDb(data);
        } else {
          // Fallback
          setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({
            id: `fallback-id-${i}`,
            nombre
          })));
        }
      } catch (e) {
        setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({
          id: `fallback-id-${i}`,
          nombre
        })));
      }
    };
    cargarAsesores();
  }, []);

  // Cargar datos del día seleccionado
  useEffect(() => {
    const cargarGestiones = async () => {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('avance_diario')
          .select(`
            id,
            asesor_id,
            cant_leads_gestionados,
            acciones_efectivas,
            asesores (nombre)
          `)
          .eq('fecha', fechaSeleccionada);
          
        if (data && !error && data.length > 0) {
          const gestionesMapeadas = data.map(item => ({
            asesor: item.asesores?.nombre || 'Desconocido',
            cant_leads_gestionados: item.cant_leads_gestionados,
            acciones_efectivas: item.acciones_efectivas,
            bd_id: item.id
          }));
          setDatos(gestionesMapeadas);
        } else {
          // Iniciar vacío o simular si no hay BD
          setDatos(asesoresDb.map(a => ({
            asesor: a.nombre,
            cant_leads_gestionados: 0,
            acciones_efectivas: 0,
          })));
        }
      } catch (e) {
        setDatos(asesoresDb.map(a => ({
          asesor: a.nombre,
          cant_leads_gestionados: 0,
          acciones_efectivas: 0,
        })));
      } finally {
        setCargando(false);
      }
    };
    
    if (asesoresDb.length > 0) {
      cargarGestiones();
    }
  }, [fechaSeleccionada, asesoresDb]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const nuevosDatos = [];

        parsedData.forEach(row => {
          const rawStr = (row['Usuario'] || '').toString();
          const usuarioStr = rawStr.replace(/\s+/g, ' ').trim();
          
          const leads = parseInt(row['CantLeadsGestionados'] || row['Cant Leads Gestionados'] || '0', 10);
          const efectivas = parseInt(row['AccionesEfectiva'] || row['Acciones Efectiva'] || '0', 10);

          if (usuarioStr) {
            const normExcel = usuarioStr.toLowerCase();
            const indice = nuevosDatos.findIndex(d => 
              (d.asesor || '').toLowerCase() === normExcel
            );
            
            if (indice !== -1) {
              nuevosDatos[indice].cant_leads_gestionados += leads;
              nuevosDatos[indice].acciones_efectivas += efectivas;
            } else {
              nuevosDatos.push({
                asesor: usuarioStr,
                cant_leads_gestionados: leads,
                acciones_efectivas: efectivas
              });
            }
          }
        });

        setDatos(nuevosDatos);
        setMensaje({ tipo: 'success', texto: 'Excel importado. Recuerda guardar los cambios.' });
        e.target.value = null;
      } catch (error) {
        setMensaje({ tipo: 'error', texto: `Error procesando Excel: ${error.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  const guardarEnBD = async () => {
    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const insertData = datos.map(item => ({
        fecha: fechaSeleccionada,
        asesor: item.asesor,
        cant_leads_gestionados: item.cant_leads_gestionados,
        acciones_efectivas: item.acciones_efectivas,
      }));

      const { error } = await supabase
        .from('avance_diario')
        .upsert(insertData, { onConflict: 'fecha,asesor' });

      if (error) throw error;

      setMensaje({ tipo: 'success', texto: 'Datos guardados correctamente.' });
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${e.message}` });
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const copiarImagen = async () => {
    if (tablaRef.current) {
      try {
        const canvas = await html2canvas(tablaRef.current, {
          backgroundColor: '#ffffff',
          scale: 2 // Mejor calidad
        });
        
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setMensaje({ tipo: 'success', texto: '¡Imagen copiada al portapapeles!' });
          } catch (err) {
            setMensaje({ tipo: 'error', texto: 'No se pudo copiar la imagen (permisos de navegador).' });
          }
        });
      } catch (err) {
        setMensaje({ tipo: 'error', texto: 'Error al generar la imagen.' });
      }
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const calcularAvance = (gestiones) => {
    if (!metaDiaria || metaDiaria <= 0) return 0;
    return Math.min(Math.round((gestiones / metaDiaria) * 100), 100);
  };

  const getRowGradient = (porcentaje) => {
    if (porcentaje >= 80) return 'bg-gradient-to-r from-green-50 to-green-100/50 text-green-900 border-b border-green-200';
    if (porcentaje >= 40) return 'bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-900 border-b border-orange-100';
    return 'bg-gradient-to-r from-red-50 to-red-100/50 text-red-900 border-b border-red-200';
  };

  const datosOrdenados = [...datos].sort((a, b) => (b.cant_leads_gestionados || 0) - (a.cant_leads_gestionados || 0));
  const datosVisibles = datosOrdenados.filter(d => !asesoresOcultos.includes(d.asesor));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Avance de Asesores</h2>
          <p className="text-sm text-gray-500">Gestiones diarias, leads y acciones efectivas.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setModoCiego(!modoCiego)}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors border border-gray-300 text-sm font-medium"
          >
            {modoCiego ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {modoCiego ? "Modo Normal" : "Modo Ciego"}
          </button>
          
          <button 
            onClick={copiarImagen}
            className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Copiar Imagen
          </button>
          
          <button
            onClick={guardarEnBD}
            disabled={guardando}
            className="flex items-center px-4 py-2 bg-pachamama-green text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-md flex items-center ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          mensaje.tipo === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        {/* Controles: Fecha, Meta, CSV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Gestión</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="pl-10 block w-full shadow-sm focus:ring-pachamama-green focus:border-pachamama-green sm:text-sm border-gray-300 rounded-md p-2 border"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Diaria de Gestiones</label>
            <input
              type="number"
              min="1"
              value={metaDiaria}
              onChange={(e) => setMetaDiaria(parseInt(e.target.value) || 0)}
              className="block w-full shadow-sm focus:ring-pachamama-green focus:border-pachamama-green sm:text-sm border-gray-300 rounded-md p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importar Excel de Gestiones</label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-md p-2 text-center hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center">
              <Upload className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Subir Excel</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Píldoras para Ocultar Asesores */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-3">Filtrar Asesores (Clic para ocultar/mostrar)</label>
          <div className="flex flex-wrap gap-2">
            {datosOrdenados.map((d, idx) => {
              const estaOculto = asesoresOcultos.includes(d.asesor);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (estaOculto) {
                      setAsesoresOcultos(asesoresOcultos.filter(a => a !== d.asesor));
                    } else {
                      setAsesoresOcultos([...asesoresOcultos, d.asesor]);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    estaOculto ? 'bg-gray-200 text-gray-400 border-gray-300 hover:bg-gray-300 hover:text-gray-600' : 'bg-pachamama-green text-white border-green-700 shadow-sm hover:bg-green-700'
                  }`}
                >
                  {modoCiego ? `Asesor ${idx+1}` : d.asesor.split(' ').slice(0,2).join(' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla generable como Imagen */}
        <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200" ref={tablaRef}>
          {/* Header para la imagen copiada */}
          <div className="bg-pachamama-earth text-white p-4 text-center">
            <h3 className="text-lg font-bold">Avance Diario de Asesores</h3>
            <p className="text-sm opacity-90 font-medium">
              {format(parseISO(fechaSeleccionada), "EEEE d 'de' MMMM 'de' yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())} | {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })} | Meta: {metaDiaria} Gestiones
            </p>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asesor
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gestiones (Leads)
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones Efectivas
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avance %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cargando ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                    Cargando datos...
                  </td>
                </tr>
              ) : datosVisibles.map((row, index) => {
                const avance = calcularAvance(row.cant_leads_gestionados);
                return (
                  <tr key={index} className={`transition-all hover:opacity-90 ${getRowGradient(avance)}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-white/60 border border-black/5 flex items-center justify-center font-bold text-xs mr-3 shadow-sm">
                          {modoCiego ? `A${index+1}` : row.asesor.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </div>
                        <div className="text-sm font-bold">
                          {modoCiego ? `Asesor ${index + 1}` : row.asesor}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-black">
                      {row.cant_leads_gestionados}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold opacity-80">
                      {row.acciones_efectivas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-base font-black">
                        {avance}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AvanceAsesores;
