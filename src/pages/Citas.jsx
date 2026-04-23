import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, Upload, CheckSquare, Square, Filter, Plus, Save, CheckCircle2, Clock, Users, BarChart3, Image as ImageIcon 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';

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

const pad2 = (n) => String(n).padStart(2, '0');

const splitExcelDateTime = (value) => {
  if (value === undefined || value === null || value === '') {
    const now = new Date();
    return {
      dateOnly: `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`,
      timeOnly: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      iso: now.toISOString(),
    };
  }

  let jsDate = null;

  // a) Excel serial number (e.g. 45320.604166)
  const isSerial =
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()));

  if (isSerial) {
    const serial = parseFloat(value);
    const utcMs = Math.round((serial - 25569) * 86400 * 1000);
    const utc = new Date(utcMs);
    // Rebuild as local time so the wall-clock values from Excel are preserved.
    jsDate = new Date(
      utc.getUTCFullYear(),
      utc.getUTCMonth(),
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
      utc.getUTCSeconds()
    );
  } else {
    const str = value.toString().trim();

    // "YYYY-MM-DD HH:mm[:ss]" or "YYYY-MM-DDTHH:mm[:ss]"
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      jsDate = new Date(
        parseInt(isoMatch[1], 10),
        parseInt(isoMatch[2], 10) - 1,
        parseInt(isoMatch[3], 10),
        parseInt(isoMatch[4], 10),
        parseInt(isoMatch[5], 10),
        parseInt(isoMatch[6] || '0', 10)
      );
    } else {
      // "DD/MM/YYYY [HH:mm[:ss] [a.m./p.m.]]"
      const dateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const year = parseInt(dateMatch[3], 10);
        let hour = 0, minute = 0;
        const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
          const lower = str.toLowerCase();
          const isPM = lower.includes('p.m.') || lower.includes('p. m.') || /\bpm\b/.test(lower);
          const isAM = lower.includes('a.m.') || lower.includes('a. m.') || /\bam\b/.test(lower);
          if (isPM && hour < 12) hour += 12;
          if (isAM && hour === 12) hour = 0;
        }
        jsDate = new Date(year, month, day, hour, minute, 0);
      } else {
        const fallback = new Date(str);
        jsDate = isNaN(fallback.getTime()) ? new Date() : fallback;
      }
    }
  }

  const dateOnly = `${pad2(jsDate.getDate())}/${pad2(jsDate.getMonth() + 1)}/${jsDate.getFullYear()}`;
  const timeOnly = `${pad2(jsDate.getHours())}:${pad2(jsDate.getMinutes())}`;
  return { dateOnly, timeOnly, iso: jsDate.toISOString() };
};

const Citas = () => {
  const [datos, setDatos] = useState([]);
  const [asesoresDb, setAsesoresDb] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const contenedorRef = useRef(null);
  
  // Filtros
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Formulario Manual
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaCita, setNuevaCita] = useState({
    asesor: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '10:00',
    tipo: 'Presencial',
    nivelInteres: 'Alto',
    cliente: 'Cliente de Prueba'
  });

  // Inicialización y carga de Supabase
  useEffect(() => {
    const cargarAsesores = async () => {
      try {
        const { data, error } = await supabase.from('asesores').select('*');
        if (data && data.length > 0 && !error) {
          setAsesoresDb(data);
        } else {
          setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({
            id: `fallback-id-${i}`, nombre
          })));
        }
      } catch (e) {
        setAsesoresDb(asesoresListaOriginal.map((nombre, i) => ({
          id: `fallback-id-${i}`, nombre
        })));
      }
    };
    cargarAsesores();
  }, []);

  useEffect(() => {
    const cargarCitas = async () => {
      if (asesoresDb.length === 0) return;
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('citas')
          .select(`
            id, asesor_id, cliente_nombre, fecha_hora, tipo_cita, nivel_interes, estado,
            asesores (nombre)
          `)
          .order('fecha_hora', { ascending: false });
          
        if (data && !error && data.length > 0) {
          setDatos(data.map(item => ({
            bd_id: item.id,
            asesor: item.asesores?.nombre || 'Desconocido',
            fecha_hora: item.fecha_hora,
            tipo_cita: item.tipo_cita || 'General',
            nivel_interes: item.nivel_interes || 'Medio',
            estado: item.estado,
            cliente_nombre: item.cliente_nombre
          })));
        }
      } catch (e) {
        console.log('Modo local activado para citas');
      } finally {
        setCargando(false);
      }
    };
    cargarCitas();
  }, [asesoresDb]);

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

        if (parsedData.length === 0) {
          setMensaje({ tipo: 'warning', texto: 'El archivo no contiene datos.' });
          e.target.value = null;
          return;
        }

        // RULE 1: the date column must be named exactly "Fecha_de_cita" (case-sensitive).
        const headerKeys = Object.keys(parsedData[0]);
        if (!headerKeys.includes('Fecha_de_cita')) {
          console.error('Column "Fecha_de_cita" not found in Excel file.');
          setMensaje({ tipo: 'error', texto: 'Column "Fecha_de_cita" not found in Excel file.' });
          e.target.value = null;
          return;
        }

        const nuevosDatos = [...datos];

        parsedData.forEach(row => {
          const rawAsesor = (row['Responsable_de_cita'] || row['Responsable de cita'] || '').toString().trim();
          const matchExato = asesoresDb.find(a => a.nombre.toLowerCase() === rawAsesor.toLowerCase());
          const asesor = matchExato ? matchExato.nombre : (rawAsesor || 'Desconocido');

          const tipo = (row['Tipo_de_cita'] || row['Tipo de cita'] || '').toString().trim() || 'General';
          const interes = (row['Nivel_de_Interes'] || row['Nivel de Interes'] || '').toString().trim() || 'Medio';
          const estado = (row['Estado_de_cita'] || row['Estado de cita'] || '').toString().trim() || 'Pendiente';

          // RULE 2: read ONLY "Fecha_de_cita" and split into dateOnly + timeOnly.
          const { dateOnly, timeOnly, iso } = splitExcelDateTime(row['Fecha_de_cita']);

          nuevosDatos.push({
            bd_id: `temp-${Date.now()}-${Math.random()}`,
            asesor,
            fecha_hora: iso,
            dateOnly,
            timeOnly,
            tipo_cita: tipo,
            nivel_interes: interes,
            estado: estado,
            cliente_nombre: 'Importado de Excel',
            esNuevo: true
          });
        });

        setDatos(nuevosDatos);
        setMensaje({ tipo: 'success', texto: `${parsedData.length} citas importadas correctamente.` });
        e.target.value = null;
      } catch (err) {
        setMensaje({ tipo: 'error', texto: `Error procesando Excel: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!nuevaCita.asesor) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un asesor.' });
      return;
    }

    const fechaHoraComposita = new Date(`${nuevaCita.fecha}T${nuevaCita.hora}:00`).toISOString();
    
    const nueva = {
      bd_id: `temp-${Date.now()}`,
      asesor: nuevaCita.asesor,
      fecha_hora: fechaHoraComposita,
      tipo_cita: nuevaCita.tipo,
      nivel_interes: nuevaCita.nivelInteres,
      estado: 'Pendiente',
      cliente_nombre: nuevaCita.cliente,
      esNuevo: true
    };

    setDatos([nueva, ...datos]);
    setMostrarFormulario(false);
    setMensaje({ tipo: 'success', texto: 'Cita manual agregada.' });
  };

  const toggleCheckMagico = async (cita) => {
    const nuevoEstado = cita.estado === 'Concretada' ? 'Pendiente' : 'Concretada';
    
    // Optimistic UI update
    setDatos(datos.map(d => d.bd_id === cita.bd_id ? { ...d, estado: nuevoEstado } : d));

    if (!cita.bd_id.toString().startsWith('temp-')) {
      try {
        const { error } = await supabase
          .from('citas')
          .update({ estado: nuevoEstado })
          .eq('id', cita.bd_id);
          
        if (error) throw error;
        setMensaje({ tipo: 'success', texto: 'Estado actualizado en la base de datos.' });
      } catch (err) {
        // Rollback
        setDatos(datos.map(d => d.bd_id === cita.bd_id ? { ...d, estado: cita.estado } : d));
        setMensaje({ tipo: 'error', texto: 'Error al actualizar en la base de datos.' });
      }
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const guardarCambiosBD = async () => {
    setCargando(true);
    const nuevasCitas = datos.filter(d => d.esNuevo);
    
    if (nuevasCitas.length === 0) {
      setMensaje({ tipo: 'warning', texto: 'No hay citas nuevas para guardar.' });
      setCargando(false);
      return;
    }

    try {
      const insertData = nuevasCitas.map(item => {
        const asesorBd = asesoresDb.find(a => 
          a.nombre.toLowerCase() === item.asesor.toLowerCase() || 
          item.asesor.toLowerCase().includes(a.nombre.toLowerCase())
        );
        
        if (!asesorBd || asesorBd.id.toString().includes('fallback')) return null;

        return {
          asesor_id: asesorBd.id,
          cliente_nombre: item.cliente_nombre,
          fecha_hora: item.fecha_hora,
          tipo_cita: item.tipo_cita,
          nivel_interes: item.nivel_interes,
          estado: item.estado
        };
      }).filter(Boolean);

      if (insertData.length > 0) {
        const { error } = await supabase.from('citas').insert(insertData);
        if (error) throw error;
        
        // Remove 'esNuevo' flags
        setDatos(datos.map(d => ({ ...d, esNuevo: false })));
        setMensaje({ tipo: 'success', texto: 'Citas guardadas exitosamente en la BD.' });
      } else {
        setMensaje({ tipo: 'warning', texto: 'Modo local: Configura Supabase para guardar permanentemente.' });
      }
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error al conectar con la base de datos.' });
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const copiarImagen = async () => {
    if (contenedorRef.current) {
      try {
        const canvas = await html2canvas(contenedorRef.current, {
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

  // Datos filtrados
  const datosFiltrados = datos.filter(d => {
    const pasaAsesor = filtroAsesor ? d.asesor === filtroAsesor : true;
    const pasaEstado = filtroEstado ? d.estado === filtroEstado : true;
    return pasaAsesor && pasaEstado;
  }).sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

  // Datos para el gráfico
  const dataGrafico = asesoresListaOriginal.map(nombre => {
    const citasAsesor = datos.filter(d => d.asesor.includes(nombre) || nombre.includes(d.asesor));
    return {
      name: nombre.split(' ')[0] + ' ' + (nombre.split(' ')[1]?.[0] || ''),
      Concretadas: citasAsesor.filter(d => d.estado === 'Concretada').length,
      Pendientes: citasAsesor.filter(d => d.estado !== 'Concretada').length,
    };
  });

  return (
    <div className="space-y-6 bg-gray-50 p-4 rounded-xl" ref={contenedorRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Reuniones</h2>
          <p className="text-sm text-gray-500">Gestión híbrida de citas comerciales.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative border border-gray-300 rounded-md p-2 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center text-sm font-medium">
            <Upload className="h-4 w-4 mr-2 text-pachamama-earth" />
            <span>Importar Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <button 
            onClick={copiarImagen}
            className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Copiar Imagen
          </button>
          <button 
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="flex items-center px-3 py-2 bg-pachamama-earth text-white rounded-md hover:bg-[#7a4f25] transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </button>
          <button 
            onClick={guardarCambiosBD}
            disabled={cargando}
            className="flex items-center px-4 py-2 bg-pachamama-green text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar BD
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-md flex items-center ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          mensaje.tipo === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
          'bg-green-50 text-green-700 border-green-200'
        }`}>
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {mensaje.texto}
        </div>
      )}

      {/* Formulario Manual */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-pachamama-earth/30">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Registrar Cita Manual</h3>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asesor Responsable</label>
              <select 
                value={nuevaCita.asesor} onChange={(e) => setNuevaCita({...nuevaCita, asesor: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green focus:border-pachamama-green p-2 border" required
              >
                <option value="">Seleccione Asesor...</option>
                {asesoresListaOriginal.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cita</label>
              <select 
                value={nuevaCita.tipo} onChange={(e) => setNuevaCita({...nuevaCita, tipo: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green focus:border-pachamama-green p-2 border"
              >
                <option value="Presencial">Presencial</option>
                <option value="Virtual">Virtual</option>
                <option value="Llamada">Llamada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input 
                type="date" value={nuevaCita.fecha} onChange={(e) => setNuevaCita({...nuevaCita, fecha: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input 
                type="time" value={nuevaCita.hora} onChange={(e) => setNuevaCita({...nuevaCita, hora: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border" required
              />
            </div>
            <div className="lg:col-span-4 flex justify-end mt-2">
              <button type="submit" className="bg-pachamama-earth text-white px-6 py-2 rounded-md hover:bg-[#7a4f25] transition font-medium">
                Agregar a la lista
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analítica y Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-pachamama-green" />
              Rendimiento de Citas por Asesor
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Concretadas" stackId="a" fill="#228B22" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Pendientes" stackId="a" fill="#8B5A2B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2 text-pachamama-green" />
            Filtros Activos
          </h3>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Asesor</label>
              <select 
                value={filtroAsesor} onChange={(e) => setFiltroAsesor(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border bg-gray-50"
              >
                <option value="">Todos los Asesores</option>
                {asesoresListaOriginal.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Cita</label>
              <select 
                value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-pachamama-green p-2 border bg-gray-50"
              >
                <option value="">Todos los Estados</option>
                <option value="Concretada">Concretada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100 text-center">
            <span className="block text-2xl font-bold text-pachamama-green">{datosFiltrados.length}</span>
            <span className="text-sm text-green-800">Citas Encontradas</span>
          </div>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Check Mágico
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asesor Responsable
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo / Interés
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cargando && datos.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">Cargando citas...</td></tr>
              ) : datosFiltrados.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">No hay citas que coincidan con los filtros.</td></tr>
              ) : (
                datosFiltrados.map((row, index) => {
                  const esConcretada = row.estado === 'Concretada';
                  return (
                    <tr key={index} className={`transition-colors ${esConcretada ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-center cursor-pointer" onClick={() => toggleCheckMagico(row)}>
                        {esConcretada ? (
                          <CheckSquare className="h-6 w-6 text-pachamama-green mx-auto" />
                        ) : (
                          <Square className="h-6 w-6 text-gray-400 mx-auto hover:text-pachamama-green transition-colors" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {row.asesor}
                            {row.esNuevo && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">No guardado</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-normal text-gray-900">
                          {row.dateOnly || format(new Date(row.fecha_hora), "dd/MM/yyyy")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {row.timeOnly || format(new Date(row.fecha_hora), "HH:mm")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.tipo_cita}</div>
                        <div className="text-xs text-gray-500">Interés: {row.nivel_interes}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          esConcretada ? 'bg-green-100 text-green-800' : 
                          row.estado === 'Cancelada' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Citas;
