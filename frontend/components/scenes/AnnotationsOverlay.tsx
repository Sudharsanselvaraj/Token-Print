import { useStore } from "@/lib/store";
import { Html } from "@react-three/drei";
import { useState } from "react";
import type { TraceAnnotation } from "@/lib/types";

export default function AnnotationsOverlay() {
  const annotations = useStore((s) => s.annotations);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const opIndex = useStore((s) => s.opIndex);

  // We only show annotations that match the current opIndex, 
  // or annotations that don't have an opIndex (global/spatial).
  const visibleAnnotations = annotations.filter(
    (a) => a.opIndex === undefined || a.opIndex === opIndex
  );

  return (
    <group>
      {visibleAnnotations.map((ann) => (
        <AnnotationItem 
          key={ann.id} 
          ann={ann} 
          onUpdate={(text) => updateAnnotation(ann.id, text)} 
          onRemove={() => removeAnnotation(ann.id)} 
        />
      ))}
    </group>
  );
}

function AnnotationItem({ 
  ann, 
  onUpdate, 
  onRemove 
}: { 
  ann: TraceAnnotation; 
  onUpdate: (text: string) => void; 
  onRemove: () => void; 
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ann.text);

  return (
    <Html position={ann.position} center zIndexRange={[100, 0]} className="annotation-marker">
      <div className="annotation-content">
        <div className="annotation-pin">📍</div>
        {editing ? (
          <div className="annotation-edit">
            <textarea 
              autoFocus
              value={text} 
              onChange={(e) => setText(e.target.value)} 
            />
            <div className="annotation-actions">
              <button onClick={() => { onUpdate(text); setEditing(false); }}>Save</button>
              <button onClick={() => onRemove()}>Delete</button>
            </div>
          </div>
        ) : (
          <div className="annotation-text" onDoubleClick={() => setEditing(true)}>
            {ann.text}
          </div>
        )}
      </div>
    </Html>
  );
}
