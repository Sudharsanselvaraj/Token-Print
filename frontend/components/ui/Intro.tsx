"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * One-time intro: a title resolving out of a soft particle haze. Shown once per
 * browser session (sessionStorage flag), auto-dismisses, and can be skipped —
 * never a blocking gate on repeat visits.
 */
export default function Intro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("ns_intro_seen")) {
        setShow(true);
        sessionStorage.setItem("ns_intro_seen", "1");
      }
    } catch {
      /* sessionStorage unavailable — just skip the intro */
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        >
          <div className="intro-haze" />
          <motion.div
            className="intro-title"
            initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          >
            Neuro<span className="dot">Scope</span>
          </motion.div>
          <motion.div
            className="intro-tag"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1.1 }}
          >
            a real language model, made explorable
          </motion.div>
          <motion.button
            className="intro-skip"
            onClick={() => setShow(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
          >
            Enter →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
