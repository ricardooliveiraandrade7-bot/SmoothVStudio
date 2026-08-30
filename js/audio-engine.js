// ==========================================================
// PARTE 1/6
// SMOOTHVSTUDIO
// AUDIO ENGINE
// ==========================================================
//
// Responsabilidade:
//
// - criar o AudioContext;
// - decodificar arquivos de áudio;
// - manter o áudio original;
// - executar o processamento neutro;
// - manter o resultado processado.
//
// Este arquivo NÃO contém:
//
// - Analyzer;
// - inteligência;
// - machine learning;
// - DSP;
// - presets;
// - Vocal Smoother;
// - tratamento de voz;
// - exportação WAV;
// - download;
// - compartilhamento.
//
// ==========================================================


"use strict";


// ==========================================================
// AUDIO ENGINE
// ==========================================================

class AudioEngine {


    // ======================================================
    // CONSTRUTOR
    // ======================================================

    constructor() {

        this.audioContext =
            null;


        this.originalBuffer =
            null;


        this.processedBuffer =
            null;


        this.sampleRate =
            44100;
    }


    // ======================================================
    // CRIAR AUDIO CONTEXT
    // ======================================================

    createContext() {

        if (
            this.audioContext
        ) {

            return this.audioContext;
        }


        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;


        if (
            !AudioContextClass
        ) {

            throw new Error(
                "Web Audio API não disponível."
            );
        }


        this.audioContext =
            new AudioContextClass();


        return this.audioContext;
    }


    // ======================================================
    // GARANTIR QUE O CONTEXTO ESTEJA ATIVO
    // ======================================================

    async resumeContext() {

        const context =
            this.createContext();


        if (
            context.state ===
            "suspended"
        ) {

            await context.resume();
        }


        return context;
    }


    // ======================================================
    // DECODIFICAR ARQUIVO
    // ======================================================

    async decodeFile(
        file
    ) {

        if (
            !file
        ) {

            throw new Error(
                "Nenhum arquivo foi selecionado."
            );
        }


        const context =
            await this.resumeContext();


        const arrayBuffer =
            await file.arrayBuffer();


        if (
            !arrayBuffer ||
            arrayBuffer.byteLength === 0
        ) {

            throw new Error(
                "O arquivo de áudio está vazio."
            );
        }


        const audioBuffer =
            await context.decodeAudioData(
                arrayBuffer
            );


        if (
            !audioBuffer
        ) {

            throw new Error(
                "Não foi possível decodificar o áudio."
            );
        }


        this.originalBuffer =
            audioBuffer;


        this.processedBuffer =
            null;


        this.sampleRate =
            audioBuffer.sampleRate;


        return audioBuffer;
    }


    // ======================================================
    // OBTER ÁUDIO ORIGINAL
    // ======================================================

    getOriginalBuffer() {

        return this.originalBuffer;
    }


    // ======================================================
    // OBTER ÁUDIO PROCESSADO
    // ======================================================

    getProcessedBuffer() {

        return this.processedBuffer;
    }
}

// ==========================================================
// PARTE 2/6
// PROCESSAMENTO NEUTRO
// ==========================================================


// ==========================================================
// PROCESSAR
// ==========================================================
//
// Nesta fase o processamento é propositalmente neutro.
//
// Nenhuma alteração de:
//
// - volume;
// - equalização;
// - dinâmica;
// - frequência;
// - harmônicos;
// - sibilância;
// - aspereza;
// - tonalidade;
//
// é aplicada.
//
// O método cria uma cópia independente do áudio original.
//
// ==========================================================

AudioEngine.prototype.process =
    async function() {

        if (
            !this.originalBuffer
        ) {

            throw new Error(
                "Nenhum áudio carregado."
            );
        }


        const original =
            this.originalBuffer;


        const processed =
            this.cloneAudioBuffer(
                original
            );


        this.processedBuffer =
            processed;


        return processed;
    };


// ==========================================================
// CLONAR AUDIOBUFFER
// ==========================================================
//
// A cópia é criada em um novo AudioBuffer.
//
// Isso é importante porque o resultado não deve apontar
// para os mesmos arrays de dados do áudio original.
//
// ==========================================================

AudioEngine.prototype.cloneAudioBuffer =
    function(
        source
    ) {

        if (
            !source
        ) {

            throw new Error(
                "Buffer de áudio inválido."
            );
        }


        const context =
            this.createContext();


        const clone =
            context.createBuffer(
                source.numberOfChannels,
                source.length,
                source.sampleRate
            );


        for (
            let channel = 0;
            channel < source.numberOfChannels;
            channel++
        ) {

            const sourceData =
                source.getChannelData(
                    channel
                );


            const targetData =
                clone.getChannelData(
                    channel
                );


            targetData.set(
                sourceData
            );
        }


        return clone;
    };


// ==========================================================
// VERIFICAR SE EXISTE ÁUDIO ORIGINAL
// ==========================================================

AudioEngine.prototype.hasOriginal =
    function() {

        return Boolean(
            this.originalBuffer
        );
    };


// ==========================================================
// VERIFICAR SE EXISTE RESULTADO
// ==========================================================

AudioEngine.prototype.hasProcessed =
    function() {

        return Boolean(
            this.processedBuffer
        );
    };

// ==========================================================
// PARTE 3/6
// ESTADO E INFORMAÇÕES DO ÁUDIO
// ==========================================================


// ==========================================================
// OBTER SAMPLE RATE
// ==========================================================

AudioEngine.prototype.getSampleRate =
    function() {

        if (
            this.originalBuffer
        ) {

            return (
                this.originalBuffer.sampleRate
            );
        }


        return this.sampleRate;
    };


// ==========================================================
// OBTER NÚMERO DE CANAIS
// ==========================================================

AudioEngine.prototype.getNumberOfChannels =
    function() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.numberOfChannels
        );
    };


// ==========================================================
// OBTER NÚMERO DE AMOSTRAS
// ==========================================================

AudioEngine.prototype.getLength =
    function() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.length
        );
    };


// ==========================================================
// OBTER DURAÇÃO
// ==========================================================

AudioEngine.prototype.getDuration =
    function() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.duration
        );
    };


// ==========================================================
// OBTER INFORMAÇÕES
// ==========================================================

AudioEngine.prototype.getAudioInfo =
    function() {

        if (
            !this.originalBuffer
        ) {

            return null;
        }


        return {

            sampleRate:
                this.originalBuffer.sampleRate,

            numberOfChannels:
                this.originalBuffer.numberOfChannels,

            length:
                this.originalBuffer.length,

            duration:
                this.originalBuffer.duration
        };
    };


// ==========================================================
// LIMPAR RESULTADO
// ==========================================================

AudioEngine.prototype.clearProcessed =
    function() {

        this.processedBuffer =
            null;
    };


// ==========================================================
// LIMPAR ÁUDIO ORIGINAL
// ==========================================================

AudioEngine.prototype.clearOriginal =
    function() {

        this.originalBuffer =
            null;

        this.processedBuffer =
            null;
    };


// ==========================================================
// LIMPAR ESTADO COMPLETO
// ==========================================================

AudioEngine.prototype.reset =
    function() {

        this.originalBuffer =
            null;

        this.processedBuffer =
            null;

        this.sampleRate =
            44100;
    };

// ==========================================================
// PARTE 4/6
// VALIDAÇÃO
// ==========================================================


// ==========================================================
// VALIDAR BUFFER
// ==========================================================

AudioEngine.prototype.validateBuffer =
    function(
        buffer
    ) {

        if (
            !buffer
        ) {

            return false;
        }


        if (
            typeof buffer.numberOfChannels !==
            "number"
        ) {

            return false;
        }


        if (
            typeof buffer.length !==
            "number"
        ) {

            return false;
        }


        if (
            typeof buffer.sampleRate !==
            "number"
        ) {

            return false;
        }


        if (
            buffer.numberOfChannels <= 0
        ) {

            return false;
        }


        if (
            buffer.length <= 0
        ) {

            return false;
        }


        if (
            buffer.sampleRate <= 0
        ) {

            return false;
        }


        return true;
    };


// ==========================================================
// VALIDAR ÁUDIO ORIGINAL
// ==========================================================

AudioEngine.prototype.validateOriginal =
    function() {

        return this.validateBuffer(
            this.originalBuffer
        );
    };


// ==========================================================
// VALIDAR ÁUDIO PROCESSADO
// ==========================================================

AudioEngine.prototype.validateProcessed =
    function() {

        return this.validateBuffer(
            this.processedBuffer
        );
    };


// ==========================================================
// COMPARAR ESTRUTURA
// ==========================================================
//
// Verifica se original e processado possuem a mesma estrutura.
//
// Nesta fase, como o processamento é neutro, eles devem ter:
//
// - mesmo sample rate;
// - mesmo número de canais;
// - mesmo número de amostras.
//
// ==========================================================

AudioEngine.prototype.hasSameStructure =
    function(
        original,
        processed
    ) {

        if (
            !this.validateBuffer(
                original
            )
        ) {

            return false;
        }


        if (
            !this.validateBuffer(
                processed
            )
        ) {

            return false;
        }


        return (

            original.sampleRate ===
            processed.sampleRate

            &&

            original.numberOfChannels ===
            processed.numberOfChannels

            &&

            original.length ===
            processed.length
        );
    };

// ==========================================================
// PARTE 5/6
// CONTROLE DO RESULTADO
// ==========================================================


// ==========================================================
// DEFINIR RESULTADO PROCESSADO
// ==========================================================
//
// Mantido como método separado para que futuras etapas
// possam inserir um processamento real sem alterar a
// interface pública do motor.
//
// ==========================================================

AudioEngine.prototype.setProcessedBuffer =
    function(
        buffer
    ) {

        if (
            !this.validateBuffer(
                buffer
            )
        ) {

            throw new Error(
                "Buffer processado inválido."
            );
        }


        this.processedBuffer =
            buffer;


        return this.processedBuffer;
    };


// ==========================================================
// RETORNAR RESULTADO
// ==========================================================

AudioEngine.prototype.getOutputBuffer =
    function() {

        if (
            !this.processedBuffer
        ) {

            return null;
        }


        return this.processedBuffer;
    };


// ==========================================================
// VERIFICAR PRONTO PARA PROCESSAR
// ==========================================================

AudioEngine.prototype.isReady =
    function() {

        return (
            this.validateOriginal()
        );
    };


// ==========================================================
// VERIFICAR PRONTO PARA EXPORTAR
// ==========================================================

AudioEngine.prototype.isReadyForExport =
    function() {

        return (
            this.validateProcessed()
        );
    };


// ==========================================================
// ESTADO DO MOTOR
// ==========================================================

AudioEngine.prototype.getState =
    function() {

        return {

            hasOriginal:
                this.hasOriginal(),

            hasProcessed:
                this.hasProcessed(),

            sampleRate:
                this.getSampleRate(),

            numberOfChannels:
                this.getNumberOfChannels(),

            length:
                this.getLength(),

            duration:
                this.getDuration()
        };
    };

// ==========================================================
// PARTE 6/6
// DISPONIBILIZAÇÃO GLOBAL
// ==========================================================


// ==========================================================
// EXPOR AUDIO ENGINE
// ==========================================================
//
// O app.js utiliza:
//
//     new AudioEngine()
//
// Portanto a classe precisa estar disponível no escopo
// global da aplicação.
//
// ==========================================================

window.AudioEngine =
    AudioEngine;


// ==========================================================
// FIM DO AUDIO ENGINE
// ==========================================================
//
// A cadeia atual fica:
//
// Arquivo
//    ↓
// decodeFile()
//    ↓
// originalBuffer
//    ↓
// process()
//    ↓
// cópia neutra
//    ↓
// processedBuffer
//
// Nenhum DSP é executado.
//
// ==========================================================