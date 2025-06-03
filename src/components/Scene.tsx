import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';
import { Trash2 } from 'lucide-react';

const VertexCoordinates = ({ position, onPositionChange, onDelete }) => {
  if (!position) return null;

  return (
    <div className="absolute right-4 bottom-4 bg-black/75 text-white p-4 rounded-lg font-mono">
      <div className="space-y-2">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="flex items-center gap-2">
            <label className="w-8">{axis.toUpperCase()}:</label>
            <input
              type="number"
              value={position[axis]}
              onChange={(e) => {
                const newPosition = position.clone();
                newPosition[axis] = parseFloat(e.target.value) || 0;
                onPositionChange(newPosition);
              }}
              className="bg-gray-800 px-2 py-1 rounded w-24 text-right hover:bg-gray-700 focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="any"
            />
          </div>
        ))}
        <button
          onClick={onDelete}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Vertex</span>
        </button>
      </div>
    </div>
  );
};

const VertexCountSelector = () => {
  const { selectedObject, updateCylinderVertices, updateSphereVertices } = useSceneStore();

  if (!(selectedObject instanceof THREE.Mesh)) {
    return null;
  }

  const isCylinder = selectedObject.geometry instanceof THREE.CylinderGeometry;
  const isSphere = selectedObject.geometry instanceof THREE.SphereGeometry;

  if (!isCylinder && !isSphere) {
    return null;
  }

  let currentVertexCount;
  let options;
  let onChange;

  if (isCylinder) {
    currentVertexCount = selectedObject.geometry.parameters.radialSegments;
    options = [
      { value: 32, label: '32 Vertices' },
      { value: 16, label: '16 Vertices' },
      { value: 8, label: '8 Vertices' }
    ];
    onChange = updateCylinderVertices;
  } else {
    currentVertexCount = selectedObject.geometry.parameters.widthSegments;
    options = [
      { value: 64, label: '64 Vertices' },
      { value: 32, label: '32 Vertices' },
      { value: 16, label: '16 Vertices' },
      { value: 8, label: '8 Vertices' }
    ];
    onChange = updateSphereVertices;
  }

  return (
    <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-black/75 text-white p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Vertex Count:</label>
        <select
          className="bg-gray-800 px-3 py-1.5 rounded text-sm"
          onChange={(e) => onChange(parseInt(e.target.value))}
          value={currentVertexCount}
        >
          {options.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const VertexPoints = ({ geometry, object }) => {
  const { editMode, selectedElements, startVertexDrag, deleteVertex } = useSceneStore();
  const positions = geometry.attributes.position;
  const vertices = [];
  const worldMatrix = object.matrixWorld;
  
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    ).applyMatrix4(worldMatrix);
    vertices.push(vertex);
  }

  return editMode === 'vertex' ? (
    <group>
      {vertices.map((vertex, i) => (
        <mesh
          key={i}
          position={vertex}
          onClick={(e) => {
            e.stopPropagation();
            if (editMode === 'vertex') {
              startVertexDrag(i, vertex);
            }
          }}
        >
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial
            color={selectedElements.vertices.includes(i) ? 'red' : 'yellow'}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  ) : null;
};

const EdgeLines = ({ geometry, object }) => {
  const { editMode, selectedElements, startEdgeDrag, draggedEdge } = useSceneStore();
  const positions = geometry.attributes.position;
  const edges = [];
  const worldMatrix = object.matrixWorld;

  const indices = geometry.index ? Array.from(geometry.index.array) : null;
  
  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const addEdge = (a: number, b: number) => {
        const v1 = new THREE.Vector3(
          positions.getX(indices[a]),
          positions.getY(indices[a]),
          positions.getZ(indices[a])
        ).applyMatrix4(worldMatrix);

        const v2 = new THREE.Vector3(
          positions.getX(indices[b]),
          positions.getY(indices[b]),
          positions.getZ(indices[b])
        ).applyMatrix4(worldMatrix);

        const midpoint = v1.clone().add(v2).multiplyScalar(0.5);

        edges.push({
          vertices: [indices[a], indices[b]],
          positions: [v1, v2],
          midpoint
        });
      };

      addEdge(i, i + 1);
      addEdge(i + 1, i + 2);
      addEdge(i + 2, i);
    }
  } else {
    for (let i = 0; i < positions.count; i += 3) {
      const addEdge = (a: number, b: number) => {
        const v1 = new THREE.Vector3(
          positions.getX(a),
          positions.getY(a),
          positions.getZ(a)
        ).applyMatrix4(worldMatrix);

        const v2 = new THREE.Vector3(
          positions.getX(b),
          positions.getY(b),
          positions.getZ(b)
        ).applyMatrix4(worldMatrix);

        const midpoint = v1.clone().add(v2).multiplyScalar(0.5);

        edges.push({
          vertices: [a, b],
          positions: [v1, v2],
          midpoint
        });
      };

      addEdge(i, i + 1);
      addEdge(i + 1, i + 2);
      addEdge(i + 2, i);
    }
  }

  return editMode === 'edge' ? (
    <group>
      {edges.map(({ vertices: [v1, v2], positions: [p1, p2], midpoint }, i) => {
        const points = [p1, p2];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const isSelected = draggedEdge?.indices.some(([a, b]) => 
          (a === v1 && b === v2) || (a === v2 && b === v1)
        );
        
        return (
          <group key={i}>
            <line geometry={geometry}>
              <lineBasicMaterial
                color={isSelected ? 'red' : 'yellow'}
                linewidth={2}
              />
            </line>
            <mesh
              position={midpoint}
              onClick={(e) => {
                e.stopPropagation();
                startEdgeDrag([v1, v2], [p1, p2]);
              }}
            >
              <sphereGeometry args={[0.08]} />
              <meshBasicMaterial
                color={isSelected ? 'red' : 'yellow'}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  ) : null;
};

const EditModeOverlay = () => {
  const { scene, camera, raycaster, pointer } = useThree();
  const { 
    selectedObject, 
    editMode,
    setSelectedElements,
    draggedVertex,
    draggedEdge,
    updateVertexDrag,
    updateEdgeDrag,
    endVertexDrag,
    endEdgeDrag
  } = useSceneStore();
  const plane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!selectedObject || !editMode || !(selectedObject instanceof THREE.Mesh)) return;

    const handlePointerMove = (event) => {
      if (draggedVertex || draggedEdge) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        plane.current.normal.copy(cameraDirection);
        
        if (draggedVertex) {
          plane.current.setFromNormalAndCoplanarPoint(
            cameraDirection,
            draggedVertex.position
          );
        } else if (draggedEdge) {
          plane.current.setFromNormalAndCoplanarPoint(
            cameraDirection,
            draggedEdge.positions[0]
          );
        }

        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(plane.current, intersection.current)) {
          if (draggedVertex) {
            updateVertexDrag(intersection.current);
          } else if (draggedEdge) {
            updateEdgeDrag(intersection.current);
          }
        }
      }
    };

    const handlePointerUp = () => {
      if (draggedVertex) {
        endVertexDrag();
      }
      if (draggedEdge) {
        endEdgeDrag();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    selectedObject,
    editMode,
    camera,
    raycaster,
    pointer,
    setSelectedElements,
    draggedVertex,
    draggedEdge,
    updateVertexDrag,
    updateEdgeDrag,
    endVertexDrag,
    endEdgeDrag
  ]);

  if (!selectedObject || !editMode || !(selectedObject instanceof THREE.Mesh)) return null;

  return (
    <>
      <VertexPoints geometry={selectedObject.geometry} object={selectedObject} />
      <EdgeLines geometry={selectedObject.geometry} object={selectedObject} />
    </>
  );
};

const Scene: React.FC = () => {
  const { objects, selectedObject, setSelectedObject, transformMode, editMode, draggedVertex, selectedElements, updateVertexDrag, deleteVertex } = useSceneStore();
  const [selectedPosition, setSelectedPosition] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (editMode === 'vertex' && selectedObject instanceof THREE.Mesh) {
      if (draggedVertex) {
        setSelectedPosition(draggedVertex.position);
      } else if (selectedElements.vertices.length > 0) {
        const geometry = selectedObject.geometry;
        const positions = geometry.attributes.position;
        const vertexIndex = selectedElements.vertices[0];
        const position = new THREE.Vector3(
          positions.getX(vertexIndex),
          positions.getY(vertexIndex),
          positions.getZ(vertexIndex)
        );
        position.applyMatrix4(selectedObject.matrixWorld);
        setSelectedPosition(position);
      } else {
        setSelectedPosition(null);
      }
    } else {
      setSelectedPosition(null);
    }
  }, [editMode, selectedObject, draggedVertex, selectedElements.vertices]);

  const handlePositionChange = (newPosition: THREE.Vector3) => {
    if (selectedObject instanceof THREE.Mesh) {
      updateVertexDrag(newPosition);
    }
  };

  const handleDeleteVertex = () => {
    if (selectedObject instanceof THREE.Mesh && selectedElements.vertices.length > 0) {
      deleteVertex(selectedElements.vertices[0]);
    }
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 75 }}
        className="w-full h-full bg-gray-900"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={3}
          fadeDistance={30}
          fadeStrength={1}
        />

        {objects.map(({ object, visible, id }) => (
          visible && (
            <primitive
              key={id}
              object={object}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(object);
              }}
            />
          )
        ))}

        {selectedObject && transformMode && (
          <TransformControls
            object={selectedObject}
            mode={transformMode}
          />
        )}

        <EditModeOverlay />
        <OrbitControls makeDefault />
      </Canvas>
      {editMode === 'vertex' && selectedPosition && (
        <VertexCoordinates 
          position={selectedPosition}
          onPositionChange={handlePositionChange}
          onDelete={handleDeleteVertex}
        />
      )}
      {editMode === 'vertex' && selectedObject && !(selectedObject.geometry instanceof THREE.ConeGeometry) && (
        <VertexCountSelector />
      )}
    </div>
  );
};

export default Scene;