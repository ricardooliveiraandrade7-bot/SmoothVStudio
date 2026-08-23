// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DSP BRIDGE
// V0.1
// ==========================================
// Primeira ponte experimental entre a decisão
// validada e o VocalBody.
//
// Não altera o TreatmentDecisionPipeline.
// Não concede autoridade ao Pipeline.
// Apenas entrega ao VocalBody a decisão
// já produzida pelo VocalSmoother.
//
// Fallback:
// se a decisão não existir, o comportamento
// anterior do VocalBody é preservado.
// ==========================================

(function() {
    
    "use strict";
    
    const PATCH_MARK =
      "__smoothVStudioTreatmentBridgePatched";
    
    function patchVocalBody() {
      
      if (
        typeof window === "undefined" ||
        typeof window.VocalBody !== "function"
      ) {
        return false;
      }
      
      const prototype =
        window.VocalBody.prototype;
      
      if (
        !prototype ||
        typeof prototype.createProcessor !== "function"
      ) {
        return false;
      }
      
      if (
        prototype[PATCH_MARK]
      ) {
        return true;
      }
      
      const originalCreateProcessor =
        prototype.createProcessor;
      
      prototype.createProcessor =
        function(
          context,
          analysis,
          treatmentDecision = null
        ) {
          
          return originalCreateProcessor.call(
            this,
            context,
            analysis,
            treatmentDecision
          );
        };
      
      prototype[PATCH_MARK] = true;
      
      return true;
    }
    
    function patchVocalSmoother() {
      
      if (
        typeof window === "undefined" ||
        typeof window.VocalSmoother !== "function"
      ) {
        return false;
      }
      
      const prototype =
        window.VocalSmoother.prototype;
      
      if (
        !prototype ||
        typeof prototype.process !== "function"
      ) {
        return false;
      }
      
      const mark =
        "__smoothVStudioTreatmentDecisionInjected";
      
      if (
        prototype[mark]
      ) {
        return true;
      }
      
      const originalProcess =
        prototype.process;
      
      prototype.process =
        async function(
          audioBuffer
        ) {
          
          if (
            this.body &&
            typeof this.body.createProcessor ===
            "function"
          ) {
            
            const originalBodyCreateProcessor =
              this.body.createProcessor;
            
            const smoother =
              this;
            
            this.body.createProcessor =
              function(
                context,
                analysis,
                treatmentDecision = null
              ) {
                
                return originalBodyCreateProcessor.call(
                  this,
                  context,
                  analysis,
                  smoother.lastTreatmentDecisionPipeline ||
                  treatmentDecision ||
                  null
                );
              };
            
            try {
              
              return await originalProcess.call(
                this,
                audioBuffer
              );
              
            } finally {
              
              this.body.createProcessor =
                originalBodyCreateProcessor;
            }
            
          }
          
          return originalProcess.call(
            this,
            audioBuffer
          );
        };
      
      prototype[mark] = true;
      
      return true;
    }
        function install() {
      
      const bodyReady =
        patchVocalBody();
      
      const smootherReady =
        patchVocalSmoother();
      
      if (
        bodyReady &&
        smootherReady
      ) {
        return;
      }
      
      if (
        typeof window !== "undefined"
      ) {
        window.setTimeout(
          install,
          0
        );
      }
    }
    
    install();
    
    if (
      typeof window !== "undefined"
    ) {
      window.SmoothVStudioTreatmentDSPBridge = {
        version: "0.1",
        install
      };
    }
    
    })();