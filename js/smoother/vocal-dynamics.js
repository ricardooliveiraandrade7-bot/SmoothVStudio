// ==========================================
// SMOOTHVSTUDIO
// VOCAL DYNAMICS
// V0.1
// ==========================================
//
// Primeiro módulo de dinâmica do Vocal
// Smoother.
//
// Responsável por controlar suavemente
// regiões agressivas do vocal.
//
// Não substitui ainda um compressor vocal
// completo.
//
// Esta versão trabalha principalmente
// com a região superior do espectro.
//
// ==========================================


class VocalDynamics {
    
    
    constructor(options = {}) {
        
        
        this.version =
            "0.1";
        
        
        this.threshold =
            options.threshold ??
            -14;
        
        
        this.ratio =
            options.ratio ??
            1.6;
        
        
        this.attack =
            options.attack ??
            0.025;
        
        
        this.release =
            options.release ??
            0.135;
        
        
        this.knee =
            options.knee ??
            22;
    }
        // ======================================
    // CLAMP
    // ======================================
    
    clamp(
        value,
        min,
        max
    ) {
        
        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }
    
    
    // ======================================
    // CALCULAR PARÂMETROS ADAPTATIVOS
    // ======================================
    
    calculateSettings(
            analysis
        ) {
            
            if (
                !analysis
            ) {
                
                throw new Error(
                    "Análise vocal não disponível."
                );
            }
            
            
            // ==================================
            // MÉTRICAS DINÂMICAS EXISTENTES
            // ==================================
            //
            // O VocalAnalyzer já fornece:
            //
            // - rmsDb
            // - peakDb
            //
            // A diferença entre pico e RMS
            // fornece um indicador simples da
            // dinâmica/crest factor do sinal.
            //
            // Não criamos uma nova infraestrutura
            // de análise.
            //
            // ==================================
            
            const rmsDb =
                Number(
                    analysis.rmsDb
                );
            
            
            const peakDb =
                Number(
                    analysis.peakDb
                );
            
            
            const hasValidRms =
                Number.isFinite(
                    rmsDb
                );
            
            
            const hasValidPeak =
                Number.isFinite(
                    peakDb
                );
            
            
            let dynamicScore =
                0;
                        if (
            hasValidRms &&
            hasValidPeak
        ) {

            /*
             * Crest factor aproximado:
             *
             * peakDb - rmsDb
             *
             * Uma faixa conservadora é
             * utilizada para evitar que
             * pequenos desvios de nível
             * produzam grandes mudanças
             * na compressão.
             *
             * ~6 dB  = dinâmica baixa
             * ~18 dB = dinâmica alta
             */

            const crestDb =
                this.clamp(
                    peakDb -
                    rmsDb,
                    0,
                    30
                );


            dynamicScore =
                this.clamp(
                    (
                        crestDb -
                        6
                    ) /
                    12,
                    0,
                    1
                );
        }


        // ==================================
        // CARACTERÍSTICAS AUXILIARES
        // ==================================
        //
        // Hardness, roughness e sibilance
        // permanecem disponíveis como
        // evidências auxiliares para preservar
        // o contrato de saída existente.
        //
        // Elas NÃO participam da intensidade
        // final do Dynamics. Esses fenômenos
        // possuem módulos especializados.
        //
        // ==================================

        const characteristics =
            analysis.characteristics ||
            {};


        const hardnessValue =
            Number(
                characteristics.hardness
            );


        const roughnessValue =
            Number(
                characteristics.roughness
            );


        const sibilanceValue =
            Number(
                characteristics.sibilance
            );
                    const hardness =
            Number.isFinite(
                hardnessValue
            ) ?
            this.clamp(
                hardnessValue,
                0,
                1
            ) :
            0;
        
        
        const roughness =
            Number.isFinite(
                roughnessValue
            ) ?
            this.clamp(
                roughnessValue,
                0,
                1
            ) :
            0;
        
        
        const sibilance =
            Number.isFinite(
                sibilanceValue
            ) ?
            this.clamp(
                sibilanceValue,
                0,
                1
            ) :
            0;
        
        
        const auxiliaryScore =
            this.clamp(
                (
                    hardness *
                    0.45
                ) +
                (
                    roughness *
                    0.30
                ) +
                (
                    sibilance *
                    0.25
                ),
                0,
                1
            );
        
        
        // ==================================
        // INTENSIDADE FINAL
        // ==================================
        //
        // A dinâmica real do sinal é a
        // única autoridade para determinar
        // a intensidade do Dynamics.
        //
        // Hardness, roughness e sibilance
        // não aumentam mais a compressão.
        //
        // ==================================
        
        const intensity =
            this.clamp(
                dynamicScore,
                0,
                1
            );
                    // ==================================
        // THRESHOLD ADAPTATIVO
        // ==================================
        //
        // intensidade baixa  = -8 dB
        // intensidade alta   = -20 dB
        //
        // Mantém os limites conservadores
        // já utilizados pelo módulo.
        //
        // ==================================

        const threshold =
            -8 -
            (
                intensity *
                12
            );


        // ==================================
        // RATIO ADAPTATIVO
        // ==================================
        //
        // intensidade baixa  = 1.2:1
        // intensidade alta   = 2.0:1
        //
        // ==================================

        const ratio =
            1.2 +
            (
                intensity *
                0.8
            );


        // ==================================
        // ATTACK ADAPTATIVO
        // ==================================
        //
        // intensidade baixa  = 35 ms
        // intensidade alta   = 15 ms
        //
        // Ataques mais lentos preservam
        // melhor o início natural das palavras
        // quando o controle necessário é baixo.
        //
        // ==================================

        const attack =
            0.015 +
            (
                (
                    1 -
                    intensity
                ) *
                0.020
            );
                    // ==================================
        // RELEASE ADAPTATIVO
        // ==================================
        //
        // intensidade baixa  = 180 ms
        // intensidade alta   = 90 ms
        //
        // ==================================

        const release =
            0.090 +
            (
                (
                    1 -
                    intensity
                ) *
                0.090
            );


        // ==================================
        // KNEE ADAPTATIVO
        // ==================================
        //
        // intensidade baixa  = 18 dB
        // intensidade alta   = 26 dB
        //
        // ==================================

        const knee =
            18 +
            (
                intensity *
                8
            );


        return {

            threshold,

            ratio,

            attack,

            release,

            knee,

            intensity,

            dynamicScore,

            auxiliaryScore,

            crestDb:
                hasValidRms &&
                hasValidPeak
                    ? this.clamp(
                        peakDb -
                        rmsDb,
                        0,
                        30
                    )
                    : null
        };
    }
        // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis
    ) {

        if (
            !context
        ) {

            throw new Error(
                "AudioContext inválido."
            );
        }


        const settings =
            this.calculateSettings(
                analysis
            );


        const compressor =
            context.createDynamicsCompressor();


        compressor.threshold.value =
            settings.threshold;


        compressor.knee.value =
            settings.knee;


        compressor.ratio.value =
            settings.ratio;


        compressor.attack.value =
            settings.attack;


        compressor.release.value =
            settings.release;


        return {

            processor:
                compressor,

            settings
        };
    }
}
// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalDynamics =
    VocalDynamics;