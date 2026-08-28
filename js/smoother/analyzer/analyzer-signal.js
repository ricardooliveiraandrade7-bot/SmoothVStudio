// ==========================================
// SMOOTHVSTUDIO
// ANALYZER SIGNAL
// ==========================================
//
// Funções de preparação e análise do sinal.
//
// Este módulo NÃO modifica o áudio original.
// Ele apenas cria sinais auxiliares para
// análise.
//
// ==========================================


class AnalyzerSignal {


    // ======================================
    // LOW PASS
    // ======================================

    static lowPass(
        data,
        sampleRate,
        cutoff,
        clamp
    ) {

        const output =
            new Float32Array(
                data.length
            );

        const safeCutoff =
            clamp(
                cutoff,
                1,
                sampleRate * 0.49
            );

        const rc =
            1 /
            (
                2 *
                Math.PI *
                safeCutoff
            );

        const dt =
            1 /
            sampleRate;

        const alpha =
            dt /
            (
                rc +
                dt
            );

        let previous = 0;

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            previous +=
                alpha *
                (
                    data[i] -
                    previous
                );

            output[i] =
                previous;
        }

        return output;
    }


    // ======================================
    // ENERGIA DE BANDA
    // ======================================

    static calculateBandEnergy(
        data,
        sampleRate,
        lowCut,
        highCut,
        clamp,
        calculateRMS
    ) {

        if (
            !data ||
            data.length === 0
        ) {

            return 0;
        }

        const safeHigh =
            clamp(
                highCut,
                1,
                sampleRate * 0.49
            );

        const safeLow =
            clamp(
                lowCut,
                0,
                safeHigh - 1
            );

        const highPassedBase =
            this.lowPass(
                data,
                sampleRate,
                safeHigh,
                clamp
            );

        let bandSignal;

        if (
            safeLow <= 20
        ) {

            bandSignal =
                highPassedBase;

        } else {

            const lower =
                this.lowPass(
                    data,
                    sampleRate,
                    safeLow,
                    clamp
                );

            bandSignal =
                new Float32Array(
                    data.length
                );

            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                bandSignal[i] =
                    highPassedBase[i] -
                    lower[i];
            }
        }

        return calculateRMS(
            bandSignal
        );
    }


    // ======================================
    // CRIAR BANDA
    // ======================================

    static createBandSignal(
        data,
        sampleRate,
        lowCut,
        highCut,
        clamp
    ) {

        const safeHigh =
            clamp(
                highCut,
                1,
                sampleRate * 0.49
            );

        const safeLow =
            clamp(
                lowCut,
                0,
                safeHigh - 1
            );

        const high =
            this.lowPass(
                data,
                sampleRate,
                safeHigh,
                clamp
            );

        if (
            safeLow <= 20
        ) {

            return high;
        }

        const low =
            this.lowPass(
                data,
                sampleRate,
                safeLow,
                clamp
            );

        const band =
            new Float32Array(
                data.length
            );

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            band[i] =
                high[i] -
                low[i];
        }

        return band;
    }


    // ======================================
    // MONO
    // ======================================

    static createMonoBuffer(
        audioBuffer
    ) {

        const length =
            audioBuffer.length;

        const channels =
            audioBuffer.numberOfChannels;

        const mono =
            new Float32Array(
                length
            );

        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );

            for (
                let i = 0;
                i < length;
                i++
            ) {

                mono[i] +=
                    data[i] /
                    channels;
            }
        }

        return mono;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerSignal =
    AnalyzerSignal;