import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts';
import { Trophy, Activity, Calendar, DollarSign, TrendingUp, CheckSquare, Square, Award, Camera } from 'lucide-react';

const asesoresListaOriginal = [
  'Adrian Emir Flores Cossio',
  'Brunella Sanchez Velasco',
  'Segundo Adelmo Gutierrez Barrios',
  'Andrea Antuane Valerio Moreno',
  'Fátima Lucia Abad Rios',
  'Jhon Bryan Pullo Perales',
  'Vanessa Albornoz Moncada'
];

const PESOS = {
  gestiones: 1,
  efectivas: 0.5,
  cotizaciones: 1.5,
  citas_concretadas: 4,
  ventas: 10
};

const DashboardHome = () => {
  const [datosBrutos, setDatosBrutos] = useState({
    gestiones: [],
    citas: [],
    cotizaciones: [],
    ventas: []
  });
  const [cargando, setCargando] = useState(true);
  const [mensajeCopy, setMensajeCopy] = useState('');
  
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);

  // Filtros de métricas activas
  const [metricasActivas, setMetricasActivas] = useState({
    gestiones: true,
    reuniones: true,
    cotizaciones: true,
    ventas: true
  });

  useEffect(() => {
    const cargarTodo = async () => {
      setCargando(true);
      try {
        const [resGestiones, resCitas, resCotizaciones, resVentas] = await Promise.all([
          supabase.from('gestiones_diarias').select('cant_leads_gestionados, acciones_efectivas, asesores(nombre)'),
          supabase.from('citas').select('estado, asesores(nombre)'),
          supabase.from('cotizaciones').select('asesores(nombre)'),
          supabase.from('ventas').select('asesores(nombre)')
        ]);

        setDatosBrutos({
          gestiones: resGestiones.data || [],
          citas: resCitas.data || [],
          cotizaciones: resCotizaciones.data || [],
          ventas: resVentas.data || []
        });
      } catch (e) {
        console.error("Error cargando dashboard:", e);
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, []);

  // Calcular Puntos Dinámicos
  const datosCalculados = useMemo(() => {
    const mapaAsesores = {};
    
    asesoresListaOriginal.forEach(nombre => {
      mapaAsesores[nombre] = {
        nombreCorto: nombre.split(' ').map(n => n[0]).slice(0, 2).join(''),
        nombreLargo: nombre,
        ptsGestiones: 0,
        ptsEfectivas: 0,
        ptsCotizaciones: 0,
        ptsCitas: 0,
        ptsVentas: 0,
        puntosTotales: 0
      };
    });

    const getNombreAsesor = (row) => row.asesores?.nombre || null;

    // Procesar Gestiones (Leads y Efectivas)
    datosBrutos.gestiones.forEach(row => {
      const nombre = getNombreAsesor(row);
      if (nombre && mapaAsesores[nombre]) {
        mapaAsesores[nombre].ptsGestiones += (row.cant_leads_gestionados || 0) * PESOS.gestiones;
        mapaAsesores[nombre].ptsEfectivas += (row.acciones_efectivas || 0) * PESOS.efectivas;
      }
    });

    // Procesar Citas
    datosBrutos.citas.forEach(row => {
      const nombre = getNombreAsesor(row);
      if (nombre && mapaAsesores[nombre] && row.estado === 'Concretada') {
        mapaAsesores[nombre].ptsCitas += PESOS.citas_concretadas;
      }
    });

    // Procesar Cotizaciones
    datosBrutos.cotizaciones.forEach(row => {
      const nombre = getNombreAsesor(row);
      if (nombre && mapaAsesores[nombre]) {
        mapaAsesores[nombre].ptsCotizaciones += PESOS.cotizaciones;
      }
    });

    // Procesar Ventas
    datosBrutos.ventas.forEach(row => {
      const nombre = getNombreAsesor(row);
      if (nombre && mapaAsesores[nombre]) {
        mapaAsesores[nombre].ptsVentas += PESOS.ventas;
      }
    });

    // Calcular Total dependiendo de filtros activos
    const arrayResultado = Object.values(mapaAsesores).map(asesor => {
      let total = 0;
      if (metricasActivas.gestiones) total += asesor.ptsGestiones + asesor.ptsEfectivas;
      if (metricasActivas.reuniones) total += asesor.ptsCitas;
      if (metricasActivas.cotizaciones) total += asesor.ptsCotizaciones;
      if (metricasActivas.ventas) total += asesor.ptsVentas;

      return {
        ...asesor,
        puntosTotales: Number(total.toFixed(2)) // Redondear a 2 decimales
      };
    });

    return arrayResultado.sort((a, b) => b.puntosTotales - a.puntosTotales);
  }, [datosBrutos, metricasActivas]);

  const toggleMetrica = (metrica) => {
    setMetricasActivas(prev => ({ ...prev, [metrica]: !prev[metrica] }));
  };

  const copiarGrafico = async (ref, titulo) => {
    if (ref.current) {
      try {
        const canvas = await html2canvas(ref.current, { backgroundColor: '#ffffff', scale: 2 });
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setMensajeCopy(`¡${titulo} copiado al portapapeles!`);
            setTimeout(() => setMensajeCopy(''), 3000);
          } catch (e) {
            console.error('Error al copiar al portapapeles', e);
          }
        });
      } catch (err) {
        console.error('Error al generar imagen', err);
      }
    }
  };

  const getMedalColor = (index) => {
    if (index === 0) return 'text-yellow-500 bg-yellow-100'; // Oro
    if (index === 1) return 'text-gray-400 bg-gray-100'; // Plata
    if (index === 2) return 'text-amber-700 bg-amber-100'; // Bronce
    return 'text-pachamama-green bg-green-50'; // Resto
  };

  const metricBox = (id, title, icon, active, onClick, colorClass) => (
    <div 
      onClick={onClick}
      className={`cursor-pointer border p-4 rounded-xl shadow-sm transition-all flex items-center justify-between ${
        active ? 'border-pachamama-green bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass} text-white`}>{icon}</div>
        <div>
          <p className={`font-bold ${active ? 'text-gray-900' : 'text-gray-500'}`}>{title}</p>
          <p className="text-xs text-gray-400">Clic para alternar</p>
        </div>
      </div>
      <div>
        {active ? <CheckSquare className="text-pachamama-green h-6 w-6" /> : <Square className="text-gray-400 h-6 w-6" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Trophy className="h-8 w-8 text-pachamama-earth" />
          Índice de Productividad y Rendimiento (IPR)
        </h2>
        <p className="mt-1 text-base text-gray-500">
          Tablero interactivo en tiempo real basado en el algoritmo de puntaje comercial Pachamama.
        </p>
      </div>

      {mensajeCopy && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md border border-green-200 text-sm font-medium flex items-center shadow-sm w-fit">
          <Camera className="h-4 w-4 mr-2" />
          {mensajeCopy}
        </div>
      )}

      {/* Controles de Métricas Interactivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricBox('gestiones', 'Gestiones (+1/0.5 pts)', <Activity size={20} />, metricasActivas.gestiones, () => toggleMetrica('gestiones'), 'bg-blue-500')}
        {metricBox('reuniones', 'Citas Concretadas (+4 pts)', <Calendar size={20} />, metricasActivas.reuniones, () => toggleMetrica('reuniones'), 'bg-purple-500')}
        {metricBox('cotizaciones', 'Cotizaciones (+1.5 pts)', <DollarSign size={20} />, metricasActivas.cotizaciones, () => toggleMetrica('cotizaciones'), 'bg-orange-500')}
        {metricBox('ventas', 'Ventas Cerradas (+10 pts)', <TrendingUp size={20} />, metricasActivas.ventas, () => toggleMetrica('ventas'), 'bg-green-600')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Ranking Visual - Columna Izquierda */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-pachamama-earth p-4 text-white text-center">
            <h3 className="text-xl font-bold">Ranking de Asesores</h3>
            <p className="text-sm opacity-90">Basado en filtros activos</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cargando ? (
              <p className="text-center text-gray-500 py-10">Calculando el algoritmo IPR...</p>
            ) : datosCalculados.map((asesor, index) => (
              <div key={asesor.nombreLargo} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                      {asesor.nombreCorto}
                    </div>
                    {index < 3 && (
                      <div className={`absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center shadow-sm ${getMedalColor(index)}`}>
                        <Award size={14} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{asesor.nombreLargo.split(' ').slice(0, 2).join(' ')}</p>
                    <p className="text-xs text-gray-500">Posición #{index + 1}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-pachamama-green">{asesor.puntosTotales}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Puntos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos de Alto Impacto - Columna Derecha */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Gráfico Principal de Barras */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Productividad Total (IPR)</h3>
              <button onClick={() => copiarGrafico(barChartRef, 'Gráfico de Barras')} className="text-xs flex items-center text-gray-500 hover:text-pachamama-green transition-colors px-2 py-1 rounded-md hover:bg-green-50">
                <Camera size={14} className="mr-1" /> Copiar Gráfico
              </button>
            </div>
            <div ref={barChartRef} className="flex-1 p-2 bg-white rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosCalculados} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="nombreLargo" tickFormatter={(v) => v.split(' ')[0]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <RechartsTooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="puntosTotales" name="Puntos IPR" radius={[6, 6, 0, 0]}>
                    {datosCalculados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#228B22' : '#8B5A2B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Líneas - Desglose (Opcional visual) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[280px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Composición de Puntos</h3>
              <button onClick={() => copiarGrafico(lineChartRef, 'Gráfico de Líneas')} className="text-xs flex items-center text-gray-500 hover:text-pachamama-green transition-colors px-2 py-1 rounded-md hover:bg-green-50">
                <Camera size={14} className="mr-1" /> Copiar Gráfico
              </button>
            </div>
            <div ref={lineChartRef} className="flex-1 p-2 bg-white rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosCalculados} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="nombreLargo" tickFormatter={(v) => v.split(' ')[0]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                  {metricasActivas.gestiones && <Line type="monotone" dataKey="ptsGestiones" name="Gestiones" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />}
                  {metricasActivas.reuniones && <Line type="monotone" dataKey="ptsCitas" name="Citas" stroke="#a855f7" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />}
                  {metricasActivas.cotizaciones && <Line type="monotone" dataKey="ptsCotizaciones" name="Cotizaciones" stroke="#f97316" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />}
                  {metricasActivas.ventas && <Line type="monotone" dataKey="ptsVentas" name="Ventas" stroke="#16a34a" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
