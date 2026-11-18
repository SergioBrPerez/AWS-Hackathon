"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type PuntoMapa = {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  precio: string;
  direccion?: string;
  /** undefined = candidato no auditado */
  encaje?: number;
  distanciaKm?: number;
};

const colorEncaje = (e: number) => (e >= 100 ? "var(--verde)" : e >= 50 ? "var(--amarillo)" : "var(--rojo)");

function icono(p: PuntoMapa) {
  const auditado = p.encaje !== undefined;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: auditado
      ? `<span class="pin" style="background:${colorEncaje(p.encaje!)}">${p.encaje}% · ${p.precio}</span>`
      : `<span class="pin pin-gris">${p.precio}</span>`,
  });
}

const iconoYo = L.divIcon({ className: "", iconSize: [0, 0], html: `<span class="pin pin-yo" title="Estás aquí"></span>` });

/** Encuadra todos los puntos, o centra uno concreto y abre su ficha. */
function Encuadre({ puntos, yo, enfocar, marcadores }: {
  puntos: PuntoMapa[]; yo?: [number, number]; enfocar?: string; marcadores: React.RefObject<Record<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    const p = enfocar && puntos.find((x) => x.id === enfocar);
    if (p) {
      map.setView([p.latitud, p.longitud], 17);
      setTimeout(() => marcadores.current[p.id]?.openPopup(), 100);
      return;
    }
    const coords: [number, number][] = puntos.map((x) => [x.latitud, x.longitud]);
    if (yo) coords.push(yo);
    if (coords.length) map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
  }, [map, puntos, yo, enfocar, marcadores]);
  return null;
}

export default function Mapa({ puntos, yo, nombreYo = "Estás aquí", enfocar, onSeleccionar }: {
  puntos: PuntoMapa[]; yo?: [number, number]; nombreYo?: string; enfocar?: string; onSeleccionar?: (id: string) => void;
}) {
  const marcadores = useRef<Record<string, L.Marker>>({});
  return (
    <div className="h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-line">
      <MapContainer center={[40.4168, -3.7038]} zoom={12} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Primero los grises, para que los auditados queden encima */}
        {[...puntos].sort((a, b) => Number(a.encaje !== undefined) - Number(b.encaje !== undefined)).map((p) => (
          <Marker
            key={p.id}
            position={[p.latitud, p.longitud]}
            icon={icono(p)}
            zIndexOffset={p.id === enfocar ? 1000 : 0}
            ref={(m) => { if (m) marcadores.current[p.id] = m; }}
          >
            <Popup>
              <strong>{p.nombre}</strong>
              {p.direccion && <><br />{p.direccion}</>}
              <br />
              {p.encaje !== undefined ? `Encaje ${p.encaje}% · ${p.precio}` : `${p.precio} · sin auditar`}
              {p.distanciaKm !== undefined && ` · a ${p.distanciaKm.toFixed(1).replace(".", ",")} km`}
              {onSeleccionar && p.encaje !== undefined && (
                <>
                  <br />
                  <button onClick={() => onSeleccionar(p.id)} style={{ color: "var(--brand)", fontWeight: 600, marginTop: 4 }}>
                    Ver su tarjeta →
                  </button>
                </>
              )}
            </Popup>
          </Marker>
        ))}
        {yo && (
          <Marker position={yo} icon={iconoYo}>
            <Popup>📍 {nombreYo}</Popup>
          </Marker>
        )}
        <Encuadre puntos={puntos} yo={yo} enfocar={enfocar} marcadores={marcadores} />
      </MapContainer>
    </div>
  );
}
