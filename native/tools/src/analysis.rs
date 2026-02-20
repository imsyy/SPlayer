use napi_derive::napi;
use num_complex::Complex32;
use rustfft::FftPlanner;
use std::fs::File;
use std::path::PathBuf;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::sample::i24;
use symphonia::core::codecs::Decoder;
use symphonia::core::formats::{FormatReader, SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

// --- Data Structures (API) ---

#[napi(object)]
pub struct AudioAnalysis {
    pub duration: f64,
    pub bpm: Option<f64>,
    #[napi(js_name = "bpm_confidence")]
    pub bpm_confidence: Option<f64>,
    #[napi(js_name = "fade_in_pos")]
    pub fade_in_pos: f64,
    #[napi(js_name = "fade_out_pos")]
    pub fade_out_pos: f64,
    #[napi(js_name = "first_beat_pos")]
    pub first_beat_pos: Option<f64>,
    pub loudness: Option<f64>, // LUFS
    #[napi(js_name = "drop_pos")]
    pub drop_pos: Option<f64>, // Chorus/Drop start
    pub version: i32,
    #[napi(js_name = "analyze_window")]
    pub analyze_window: f64,
    #[napi(js_name = "cut_in_pos")]
    pub cut_in_pos: Option<f64>,
    #[napi(js_name = "cut_out_pos")]
    pub cut_out_pos: Option<f64>,
    #[napi(js_name = "mix_center_pos")]
    pub mix_center_pos: f64,
    #[napi(js_name = "mix_start_pos")]
    pub mix_start_pos: f64,
    #[napi(js_name = "mix_end_pos")]
    pub mix_end_pos: f64,
    #[napi(js_name = "energy_profile")]
    pub energy_profile: Vec<f64>,
    #[napi(js_name = "vocal_in_pos")]
    pub vocal_in_pos: Option<f64>,
    #[napi(js_name = "vocal_out_pos")]
    pub vocal_out_pos: Option<f64>,
    #[napi(js_name = "vocal_last_in_pos")]
    pub vocal_last_in_pos: Option<f64>,
    #[napi(js_name = "outro_energy_level")]
    pub outro_energy_level: Option<f64>,
    #[napi(js_name = "key_root")]
    pub key_root: Option<i32>,
    #[napi(js_name = "key_mode")]
    pub key_mode: Option<i32>,
    #[napi(js_name = "key_confidence")]
    pub key_confidence: Option<f64>,
    #[napi(js_name = "camelot_key")]
    pub camelot_key: Option<String>,
}

#[napi(object)]
pub struct TransitionProposal {
    pub duration: f64,
    #[napi(js_name = "current_track_mix_out")]
    pub current_track_mix_out: f64,
    #[napi(js_name = "next_track_mix_in")]
    pub next_track_mix_in: f64,
    #[napi(js_name = "mix_type")]
    pub mix_type: String,
    #[napi(js_name = "filter_strategy")]
    pub filter_strategy: String,
    #[napi(js_name = "compatibility_score")]
    pub compatibility_score: f64,
    #[napi(js_name = "key_compatible")]
    pub key_compatible: bool,
    #[napi(js_name = "bpm_compatible")]
    pub bpm_compatible: bool,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct AutomationPoint {
    pub time_offset: f64,
    pub volume: f64,
    pub low_cut: f64,
    pub high_cut: f64,
}

#[napi(object)]
pub struct AdvancedTransition {
    pub start_time_current: f64,
    pub start_time_next: f64,
    pub duration: f64,
    #[napi(js_name = "pitch_shift_semitones")]
    pub pitch_shift_semitones: i32,
    #[napi(js_name = "playback_rate")]
    pub playback_rate: f64,
    #[napi(js_name = "automation_current")]
    pub automation_current: Vec<AutomationPoint>,
    #[napi(js_name = "automation_next")]
    pub automation_next: Vec<AutomationPoint>,
    pub strategy: String,
}

// --- Constants ---

const ENV_RATE: f64 = 50.0;
const WINDOW_SIZE_MS: usize = 20;
const ANALYSIS_VERSION: i32 = 13;
const DEFAULT_SAMPLE_RATE: u32 = 44100;

// Key Detection Constants
const FFT_FRAME_SIZE: usize = 4096;
const FFT_STEP: usize = 1024;
const MIN_FREQ: f32 = 80.0;
const MAX_FREQ: f32 = 5000.0;
const HAMMING_ALPHA: f32 = 0.54;
const HAMMING_BETA: f32 = 0.46;

// BPM Detection Constants
const BPM_MIN_LAG: usize = 15; // ~180 BPM at 50Hz
const BPM_MAX_LAG: usize = 55; // ~55 BPM at 50Hz
const SILENCE_THRESH_DB: f32 = -48.0;
const VOCAL_LPF_FREQ: f32 = 3000.0;
const VOCAL_HPF_FREQ: f32 = 200.0;
const LOW_LPF_FREQ: f32 = 150.0;

// Filter Coefficients (ITU-R BS.1770-4)
const LOUDNESS_PRE_FILTER: [f64; 5] = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
const LOUDNESS_RLB_FILTER: [f64; 5] = [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621];

// --- DSP Filters ---

struct BiquadFilter {
    b0: f64, b1: f64, b2: f64, a1: f64, a2: f64,
    z1: f64, z2: f64,
}

impl BiquadFilter {
    fn new(coeffs: [f64; 5]) -> Self {
        Self { 
            b0: coeffs[0], b1: coeffs[1], b2: coeffs[2], a1: coeffs[3], a2: coeffs[4], 
            z1: 0.0, z2: 0.0 
        }
    }

    fn process(&mut self, input: f64) -> f64 {
        let output = input * self.b0 + self.z1;
        self.z1 = input * self.b1 + self.z2 - self.a1 * output;
        self.z2 = input * self.b2 - self.a2 * output;
        output
    }
}

// Generic First Order Filter (LPF/HPF)
struct FirstOrderFilter {
    prev_x: f32,
    prev_y: f32,
    alpha: f32,
    is_high_pass: bool,
}

impl FirstOrderFilter {
    fn new(sample_rate: u32, cutoff: f32, is_high_pass: bool) -> Self {
        let dt = 1.0 / sample_rate as f32;
        let rc = 1.0 / (2.0 * std::f32::consts::PI * cutoff);
        let alpha = if is_high_pass { rc / (rc + dt) } else { dt / (rc + dt) };
        Self {
            prev_x: 0.0,
            prev_y: 0.0,
            alpha,
            is_high_pass,
        }
    }

    fn process(&mut self, x: f32) -> f32 {
        let y = if self.is_high_pass {
            self.alpha * (self.prev_y + x - self.prev_x)
        } else {
            self.prev_y + self.alpha * (x - self.prev_y)
        };
        self.prev_x = x;
        self.prev_y = y;
        y
    }
}

struct VocalFilter {
    lpf: FirstOrderFilter,
    hpf: FirstOrderFilter,
}

impl VocalFilter {
    fn new(sample_rate: u32) -> Self {
        Self {
            lpf: FirstOrderFilter::new(sample_rate, VOCAL_LPF_FREQ, false),
            hpf: FirstOrderFilter::new(sample_rate, VOCAL_HPF_FREQ, true),
        }
    }
    fn process(&mut self, x: f32) -> f32 {
        self.lpf.process(self.hpf.process(x))
    }
}

struct LoudnessMeter {
    pre_filter: Vec<BiquadFilter>,
    rlb_filter: Vec<BiquadFilter>,
    sum_sq: f64,
    count: u64,
}

impl LoudnessMeter {
    fn new(channels: usize) -> Self {
        let mut pre_filter = Vec::with_capacity(channels);
        let mut rlb_filter = Vec::with_capacity(channels);
        for _ in 0..channels {
            pre_filter.push(BiquadFilter::new(LOUDNESS_PRE_FILTER));
            rlb_filter.push(BiquadFilter::new(LOUDNESS_RLB_FILTER));
        }
        Self { pre_filter, rlb_filter, sum_sq: 0.0, count: 0 }
    }

    fn process(&mut self, channels: &[f32]) {
        for (i, &sample) in channels.iter().enumerate() {
            if i >= self.pre_filter.len() { break; }
            let s = self.rlb_filter[i].process(self.pre_filter[i].process(sample as f64));
            self.sum_sq += s * s;
        }
        self.count += 1;
    }

    fn get_lufs(&self) -> f64 {
        if self.count == 0 { return -70.0; }
        let mean_sq = self.sum_sq / self.count as f64;
        if mean_sq <= 0.0 { -70.0 } else { -0.691 + 10.0 * mean_sq.log10() }
    }
}

// --- Analysis Core ---

struct EnvelopeAccumulator {
    sum_sq: f32,
    count: usize,
    window_size: usize,
}

impl EnvelopeAccumulator {
    fn new(window_size: usize) -> Self {
        Self { sum_sq: 0.0, count: 0, window_size }
    }
    
    fn process(&mut self, sample: f32) -> Option<f32> {
        self.sum_sq += sample * sample;
        self.count += 1;
        if self.count >= self.window_size {
            let rms = (self.sum_sq / self.window_size as f32).sqrt();
            self.sum_sq = 0.0;
            self.count = 0;
            Some(rms)
        } else {
            None
        }
    }
}

#[derive(Default)]
struct AnalysisSegment {
    envelope: Vec<f32>,
    low_envelope: Vec<f32>,
    vocal_ratio: Vec<f32>,
}

struct TrackAnalyzer {
    path: PathBuf,
    max_analyze_time: f64,
    include_tail: bool,
    
    head: AnalysisSegment,
    tail: AnalysisSegment,
    head_pcm: Vec<f32>, // For key detection
    
    duration: f64,
    sample_rate: u32,
    
    // Internal state
    loudness_meter: LoudnessMeter,
}

impl TrackAnalyzer {
    fn new(path: String, max_time: Option<f64>, include_tail: bool) -> Self {
        Self {
            path: PathBuf::from(path),
            max_analyze_time: max_time.unwrap_or(60.0).clamp(5.0, 300.0),
            include_tail,
            head: AnalysisSegment::default(),
            tail: AnalysisSegment::default(),
            head_pcm: Vec::new(),
            duration: 0.0,
            sample_rate: DEFAULT_SAMPLE_RATE,
            loudness_meter: LoudnessMeter::new(2), // Re-init on analyze
        }
    }

    fn analyze(&mut self) -> Option<AudioAnalysis> {
        let src = File::open(&self.path).ok()?;
        let mss = MediaSourceStream::new(Box::new(src), Default::default());
        let mut hint = Hint::new();
        if let Some(ext) = self.path.extension().and_then(|s| s.to_str()) {
            hint.with_extension(ext);
        }

        let probed = symphonia::default::get_probe().format(&hint, mss, &Default::default(), &Default::default()).ok()?;
        let mut format = probed.format;
        let track = format.default_track()?;
        let track_id = track.id;
        let params = &track.codec_params;
        
        self.sample_rate = params.sample_rate.unwrap_or(DEFAULT_SAMPLE_RATE);
        self.loudness_meter = LoudnessMeter::new(2); // Assume stereo max for now
        
        // Duration estimation
        let time_base = params.time_base;
        let n_frames = params.n_frames;
        let estimated_duration = match (n_frames, time_base) {
            (Some(n), Some(tb)) => {
                let t = tb.calc_time(n);
                Some(t.seconds as f64 + t.frac)
            }
            _ => None,
        };

        let mut decoder = symphonia::default::get_codecs().make(params, &Default::default()).ok()?;
        
        // Phase 1: Head
        self.process_segment(&mut format, &mut decoder, track_id, true, time_base)?;
        
        // Phase 2: Tail
        if self.include_tail {
             if let Some(tot) = estimated_duration {
                // If total duration is significantly longer than what we analyzed + max_analyze_time
                // We only jump if there is unanalyzed gap.
                // Actually, logic is: analyze tail if song is long enough.
                if tot > self.max_analyze_time * 2.0 {
                    let seek_target = tot - self.max_analyze_time;
                    let seek_time = Time::from(seek_target);
                     if format.seek(SeekMode::Coarse, SeekTo::Time { 
                        time: seek_time, 
                        track_id: Some(track_id) 
                    }).is_ok() {
                        // Reset duration to correct time after seek? 
                        // Actually duration tracking inside process_segment handles packets.
                        // But we need to ensure we don't overwrite self.duration with wrong values if packets are weird.
                        // Wait, process_segment updates self.duration from packet timestamp.
                        // That is correct.
                        self.process_segment(&mut format, &mut decoder, track_id, false, time_base)?;
                    }
                }
             }
        }
        
        self.finalize_analysis()
    }

    fn process_segment(
        &mut self, 
        format: &mut Box<dyn FormatReader>, 
        decoder: &mut Box<dyn Decoder>, 
        track_id: u32,
        is_head: bool,
        time_base: Option<symphonia::core::units::TimeBase>
    ) -> Option<()> {
        let window_size = (self.sample_rate as usize * WINDOW_SIZE_MS) / 1000;
        if window_size == 0 { return None; }

        let mut acc_env = EnvelopeAccumulator::new(window_size);
        let mut acc_low = EnvelopeAccumulator::new(window_size);
        let mut acc_vocal = EnvelopeAccumulator::new(window_size);
        
        let mut vocal_filter = VocalFilter::new(self.sample_rate);
        let mut lpf = FirstOrderFilter::new(self.sample_rate, LOW_LPF_FREQ, false);
        
        let key_max_samples = (self.sample_rate as f64 * self.max_analyze_time.min(30.0)) as usize;
        let mut processed_duration_local = 0.0; // For fallback if time_base missing

        let segment = if is_head { &mut self.head } else { &mut self.tail };
        let loudness_meter = &mut self.loudness_meter;
        let head_pcm = &mut self.head_pcm;
        
        // Use a small buffer to hold channel data to avoid allocation per sample
        // Max 8 channels supported
        let mut frame_buf = [0.0f32; 8]; 

        loop {
            let packet = match format.next_packet() {
                Ok(p) => p,
                Err(_) => break, // End of stream
            };
            
            if packet.track_id() != track_id { continue; }

            // Timestamp handling
            let packet_time = if let Some(tb) = time_base {
                let t = tb.calc_time(packet.ts());
                t.seconds as f64 + t.frac
            } else {
                // If we sought, this local duration is wrong for absolute time, 
                // but if time_base is missing, seeking is likely impossible/unreliable anyway.
                if !is_head {
                    // If no time_base, we can't really do tail analysis properly via seek.
                    // We just continue.
                }
                self.duration + processed_duration_local
            };
            
            self.duration = packet_time;

            // Stop condition
            if is_head && packet_time > self.max_analyze_time {
                break;
            }
            
            // Decode
            let decoded = match decoder.decode(&packet) {
                Ok(d) => d,
                Err(_) => continue,
            };

            let spec = *decoded.spec();
            let frames = decoded.frames();
            let channels = spec.channels.count().min(8);
            
            if time_base.is_none() {
                processed_duration_local += frames as f64 / self.sample_rate as f64;
            }

            let capture_pcm = is_head && head_pcm.len() < key_max_samples;

            // Process Frames
            macro_rules! process_buffer {
                ($buf:expr, $convert:expr) => {
                    for i in 0..frames {
                        let mut sum = 0.0;
                        for c in 0..channels {
                            let s = $convert($buf.chan(c)[i]);
                            frame_buf[c] = s;
                            sum += s;
                        }
                        Self::process_sample_static(loudness_meter, head_pcm, sum, channels, &frame_buf[..channels], &mut acc_env, &mut acc_low, &mut acc_vocal, &mut vocal_filter, &mut lpf, segment, capture_pcm);
                    }
                }
            }

            match decoded {
                AudioBufferRef::F32(buf) => process_buffer!(buf, |s: f32| s),
                AudioBufferRef::U8(buf) => process_buffer!(buf, |s: u8| (s as f32 - 128.0) / 128.0),
                AudioBufferRef::S16(buf) => process_buffer!(buf, |s: i16| s as f32 / 32768.0),
                AudioBufferRef::S24(buf) => process_buffer!(buf, |s: i24| s.0 as f32 / 8388608.0),
                AudioBufferRef::S32(buf) => process_buffer!(buf, |s: i32| s as f32 / 2147483648.0),
                 _ => continue,
            }
        }
        Some(())
    }

    // Static helper to avoid double borrow of self
    #[inline(always)]
    fn process_sample_static(
        loudness_meter: &mut LoudnessMeter,
        head_pcm: &mut Vec<f32>,
        sum: f32,
        channels: usize,
        frame_buf: &[f32],
        acc_env: &mut EnvelopeAccumulator,
        acc_low: &mut EnvelopeAccumulator,
        acc_vocal: &mut EnvelopeAccumulator,
        vocal_filter: &mut VocalFilter,
        lpf: &mut FirstOrderFilter,
        segment: &mut AnalysisSegment,
        capture_pcm: bool
    ) {
        loudness_meter.process(frame_buf);
        
        let val = sum / channels as f32;
        let vocal = vocal_filter.process(val);
        let low = lpf.process(val);

        if capture_pcm {
            head_pcm.push(val);
        }
        
        if let Some(rms) = acc_env.process(val) { segment.envelope.push(rms); }
        if let Some(rms_low) = acc_low.process(low) { segment.low_envelope.push(rms_low); }
        if let Some(rms_vocal) = acc_vocal.process(vocal) {
             let base = *segment.envelope.last().unwrap_or(&1.0);
             segment.vocal_ratio.push(if base > 0.0001 { rms_vocal / base } else { 0.0 });
        }
    }

    fn finalize_analysis(&self) -> Option<AudioAnalysis> {
        let (fade_in, fade_out) = detect_silence(&self.head.envelope, &self.tail.envelope, self.duration, ENV_RATE, SILENCE_THRESH_DB);
        let (bpm, bpm_conf, first_beat) = detect_bpm(&self.head.envelope, &self.head.low_envelope, ENV_RATE);
        let (key_root, key_mode, key_conf) = detect_key(&self.head_pcm, self.sample_rate);
        let drop_pos = detect_drop(&self.head.envelope, ENV_RATE);
        
        let (vocal_in, vocal_out, vocal_last_in) = detect_vocals(
            &self.head.envelope, &self.head.vocal_ratio,
            &self.tail.envelope, &self.tail.vocal_ratio,
            self.duration, ENV_RATE, fade_in, fade_out
        );
        
        let smart_cut_out = calculate_smart_cut_out(
            bpm, first_beat, bpm_conf, 
            vocal_out, fade_in, fade_out, self.duration
        );

        let smart_cut_in = calculate_smart_cut_in(
            bpm, first_beat, bpm_conf, 
            vocal_in.or(drop_pos), fade_in
        );
        
        let mix_center = smart_cut_out.unwrap_or((self.duration - 10.0).max(0.0)).min(self.duration);
        let mix_duration = if let Some(b) = bpm { (240.0 / b * 8.0).clamp(15.0, 30.0) } else { 20.0 };
        let mix_start = (mix_center - mix_duration/2.0).max(0.0);
        let mix_end = (mix_center + mix_duration/2.0).min(self.duration);
        
        // Energy Profile
        let profile_rate = 10.0;
        let profile_len = ((self.duration * profile_rate).ceil() as usize).max(1);
        let mut energy_profile = vec![0.0; profile_len];
        fill_energy_profile(&mut energy_profile, &self.head.envelope, 0.0, ENV_RATE, profile_rate);
        if !self.tail.envelope.is_empty() {
             let tail_start = (self.duration - self.tail.envelope.len() as f64 / ENV_RATE).max(0.0);
             fill_energy_profile(&mut energy_profile, &self.tail.envelope, tail_start, ENV_RATE, profile_rate);
        }

        Some(AudioAnalysis {
            duration: self.duration,
            bpm,
            bpm_confidence: bpm_conf,
            fade_in_pos: fade_in,
            fade_out_pos: if self.include_tail { fade_out } else { self.duration },
            first_beat_pos: first_beat,
            loudness: Some(self.loudness_meter.get_lufs()),
            drop_pos,
            version: ANALYSIS_VERSION,
            analyze_window: self.max_analyze_time,
            cut_in_pos: smart_cut_in,
            cut_out_pos: if self.include_tail { smart_cut_out } else { None },
            mix_center_pos: mix_center,
            mix_start_pos: mix_start,
            mix_end_pos: mix_end,
            energy_profile,
            vocal_in_pos: vocal_in,
            vocal_out_pos: if self.include_tail { vocal_out } else { None },
            vocal_last_in_pos: if self.include_tail { vocal_last_in } else { None },
            outro_energy_level: calculate_outro_energy(&self.tail.envelope, ENV_RATE),
            key_root,
            key_mode,
            key_confidence: key_conf,
            camelot_key: if let (Some(r), Some(m)) = (key_root, key_mode) { get_camelot_key(r, m) } else { None },
        })
    }
}

// --- Helpers ---

fn fill_energy_profile(profile: &mut [f64], envelope: &[f32], start_time: f64, env_rate: f64, profile_rate: f64) {
    for (i, &val) in envelope.iter().enumerate() {
        let time = start_time + i as f64 / env_rate;
        let idx = (time * profile_rate) as usize;
        if idx < profile.len() {
            profile[idx] = profile[idx].max(val as f64);
        }
    }
}

fn detect_silence(head: &[f32], tail: &[f32], duration: f64, rate: f64, db_thresh: f32) -> (f64, f64) {
    let thresh = 10.0f32.powf(db_thresh / 20.0);
    let fade_in = head.iter().position(|&x| x > thresh).map(|i| i as f64 / rate).unwrap_or(0.0);
    
    let fade_out = if tail.is_empty() {
        head.iter().rposition(|&x| x > thresh).map(|i| i as f64 / rate).unwrap_or(duration)
    } else {
        let tail_dur = tail.len() as f64 / rate;
        let tail_start = (duration - tail_dur).max(0.0);
        tail.iter().rposition(|&x| x > thresh)
            .map(|i| tail_start + (i + 1) as f64 / rate)
            .unwrap_or(duration)
    };
    (fade_in, fade_out)
}

fn detect_drop(envelope: &[f32], rate: f64) -> Option<f64> {
    let window_len = (2.0 * rate) as usize;
    if envelope.len() < window_len * 2 { return None; }
    
    let mut max_ratio = 0.0;
    let mut best_idx = 0;
    let prev_len = (rate * 4.0) as usize;
    
    for i in prev_len..(envelope.len() - window_len) {
        let prev_sum: f32 = envelope[i-prev_len..i].iter().sum();
        let next_sum: f32 = envelope[i..i+window_len].iter().sum();
        let prev_avg = prev_sum / prev_len as f32;
        let next_avg = next_sum / window_len as f32;
        
        if prev_avg > 0.001 {
            let ratio = next_avg / prev_avg;
            if ratio > max_ratio {
                max_ratio = ratio;
                best_idx = i;
            }
        }
    }
    
    if max_ratio > 1.5 { Some(best_idx as f64 / rate) } else { None }
}

fn calculate_outro_energy(tail: &[f32], rate: f64) -> Option<f64> {
    if tail.is_empty() { return None; }
    let (_, local_out) = detect_silence(tail, &[], tail.len() as f64 / rate, rate, SILENCE_THRESH_DB);
    let end_idx = (local_out * rate) as usize;
    let start_idx = end_idx.saturating_sub(500); // Last 10s active
    if end_idx <= start_idx { return None; }
    
    let slice = &tail[start_idx..end_idx];
    let mean_sq: f32 = slice.iter().map(|&x| x*x).sum::<f32>() / slice.len() as f32;
    if mean_sq > 0.0 {
        Some((20.0 * mean_sq.sqrt().log10()) as f64)
    } else {
        Some(-70.0)
    }
}

fn detect_vocals(
    head_env: &[f32], head_ratio: &[f32], 
    tail_env: &[f32], tail_ratio: &[f32], 
    duration: f64, rate: f64, fade_in: f64, fade_out: f64
) -> (Option<f64>, Option<f64>, Option<f64>) {
    let is_vocal = |ratio: f32, env: f32| ratio > 0.4 && env > 0.02;
    
    let vocal_in = head_ratio.iter().zip(head_env.iter())
        .enumerate()
        .skip((fade_in * rate) as usize)
        .find(|(_, (&r, &e))| is_vocal(r, e))
        .map(|(i, _)| i as f64 / rate);
        
    let (scan_env, scan_ratio, base_time) = if !tail_env.is_empty() {
        (tail_env, tail_ratio, (duration - tail_env.len() as f64 / rate).max(0.0))
    } else {
        (head_env, head_ratio, 0.0)
    };
    
    let end_limit_idx = ((fade_out - base_time) * rate).round() as usize;
    let limit = end_limit_idx.min(scan_env.len());
    
    let vocal_out = scan_ratio.iter().zip(scan_env.iter())
        .take(limit)
        .enumerate()
        .rfind(|(_, (&r, &e))| is_vocal(r, e))
        .map(|(i, _)| base_time + i as f64 / rate);

    let vocal_last_in = vocal_out.map(|vo| (vo - 5.0).max(fade_in));

    (vocal_in, vocal_out, vocal_last_in)
}

fn snap_time(time: f64, bpm: f64, first_beat: f64, grid: f64) -> f64 {
    if bpm <= 0.0 { return time; }
    let sec_per_beat = 60.0 / bpm;
    let grid_sec = sec_per_beat * grid;
    if grid_sec <= 0.0 { return time; }
    
    let units = (time - first_beat) / grid_sec;
    let snapped = first_beat + units.round() * grid_sec;
    if snapped < 0.0 { first_beat } else { snapped }
}

fn calculate_smart_cut_out(
    bpm: Option<f64>, first_beat: Option<f64>, conf: Option<f64>,
    vocal_out: Option<f64>, _fade_in: f64, fade_out: f64, duration: f64
) -> Option<f64> {
    let search_end = if let Some(vo) = vocal_out {
        (vo + 40.0).min(fade_out)
    } else {
        fade_out
    };
    
    if let (Some(b), Some(fb)) = (bpm, first_beat) {
        if conf.unwrap_or(0.0) > 0.4 {
            let snapped = snap_time(search_end, b, fb, 4.0);
            if let Some(vo) = vocal_out {
                if snapped < vo + 2.0 {
                    return Some(snap_time(vo + 4.0, b, fb, 4.0).min(duration));
                }
            }
            return Some(snapped.min(duration));
        }
    }
    Some(search_end)
}

fn calculate_smart_cut_in(
    bpm: Option<f64>, first_beat: Option<f64>, conf: Option<f64>,
    anchor: Option<f64>, fade_in: f64
) -> Option<f64> {
    let anchor = anchor.unwrap_or(fade_in);
    if let (Some(b), Some(fb)) = (bpm, first_beat) {
        if conf.unwrap_or(0.0) > 0.4 {
            let sec_bar = 240.0 / b;
            for bars in [32.0, 16.0, 8.0] {
                let t = anchor - bars * sec_bar;
                if t > fade_in {
                    return Some(snap_time(t, b, fb, 4.0));
                }
            }
        }
    }
    Some(fade_in)
}

// --- BPM & Key Detection Wrappers ---

fn detect_bpm(env: &[f32], _low_env: &[f32], rate: f64) -> (Option<f64>, Option<f64>, Option<f64>) {
    if env.len() < 100 { return (None, None, None); }
    
    // Simple Flux
    let flux: Vec<f32> = env.windows(2).map(|w| (w[1] - w[0]).max(0.0)).collect();
    if flux.len() < 110 { return (None, None, None); }

    // Autocorrelation (60-180 BPM -> 0.33-1.0s -> 16-50 samples)
    let mut best_corr = 0.0;
    let mut best_lag = 0;
    
    for lag in BPM_MIN_LAG..BPM_MAX_LAG {
        let mut sum = 0.0;
        for i in 0..(flux.len() - lag) {
            sum += flux[i] * flux[i+lag];
        }
        if sum > best_corr {
            best_corr = sum;
            best_lag = lag;
        }
    }
    
    if best_corr <= 0.001 { return (None, None, None); }
    
    let bpm = 60.0 / (best_lag as f64 / rate);
    // Refine phase
    let first_beat = (0..best_lag).max_by_key(|&phase| {
        let mut e = 0.0;
        let mut idx = phase;
        while idx < flux.len() {
            e += flux[idx];
            idx += best_lag;
        }
        (e * 1000.0) as i32
    }).map(|p| p as f64 / rate);

    (Some(bpm), Some(0.8), first_beat)
}

fn detect_key(pcm: &[f32], sr: u32) -> (Option<i32>, Option<i32>, Option<f64>) {
    if pcm.len() < FFT_FRAME_SIZE { return (None, None, None); }
    
    let frame_size = FFT_FRAME_SIZE;
    let mut planner = FftPlanner::<f32>::new();
    let fft = planner.plan_fft_forward(frame_size);
    let mut buffer = vec![Complex32::new(0.0, 0.0); frame_size];
    let mut chroma = [0.0f32; 12];
    
    // Simple Hamming window
    let window: Vec<f32> = (0..frame_size).map(|i| HAMMING_ALPHA - HAMMING_BETA * (2.0 * std::f32::consts::PI * i as f32 / (frame_size - 1) as f32).cos()).collect();
    
    // Processing chunks
    for chunk in pcm.chunks(frame_size).step_by(FFT_STEP) {
        if chunk.len() < frame_size { break; }
        for i in 0..frame_size {
            buffer[i] = Complex32::new(chunk[i] * window[i], 0.0);
        }
        fft.process(&mut buffer);
        
        // Map bins to chroma
        for i in 1..frame_size/2 {
            let hz = i as f32 * sr as f32 / frame_size as f32;
            if hz < MIN_FREQ || hz > MAX_FREQ { continue; }
            let midi = 69.0 + 12.0 * (hz / 440.0).ln() / std::f32::consts::LN_2;
            let pc = (midi.round() as usize) % 12;
            let mag = buffer[i].norm_sqr();
            chroma[pc] += mag;
        }
    }
    
    // Correlation with Major/Minor profiles (Krumhansl-Schmuckler)
    let major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    let minor = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    let sum_sq: f32 = chroma.iter().map(|x| x*x).sum();
    if sum_sq == 0.0 { return (None, None, None); }
    let norm = sum_sq.sqrt();
    for x in chroma.iter_mut() { *x /= norm; }
    
    let mut best_score = -1.0;
    let mut best_root = 0;
    let mut best_mode = 0; // 0=Maj, 1=Min
    
    for root in 0..12 {
        let mut s_maj = 0.0;
        let mut s_min = 0.0;
        for i in 0..12 {
            let idx = (i + 12 - root) % 12;
            s_maj += chroma[i] * major[idx] as f32;
            s_min += chroma[i] * minor[idx] as f32;
        }
        if s_maj > best_score { best_score = s_maj; best_root = root; best_mode = 0; }
        if s_min > best_score { best_score = s_min; best_root = root; best_mode = 1; }
    }
    
    if best_score > 0.0 {
        (Some(best_root as i32), Some(best_mode), Some(0.8))
    } else {
        (None, None, None)
    }
}

// --- Transition Logic ---

#[derive(Debug)]
struct MixStrategy {
    name: &'static str,
    filter: &'static str,
    bars: f64,
    req_key: bool,
    req_bpm: bool,
}

impl MixStrategy {
    const fn new(name: &'static str, filter: &'static str, bars: f64, req_bpm: bool, req_key: bool) -> Self {
        Self { name, filter, bars, req_bpm, req_key }
    }
}

const STRATEGIES: &[MixStrategy] = &[
    MixStrategy::new("Harmonic Deep Blend", "Eq Swap (Bass/Mid)", 32.0, true, true),
    MixStrategy::new("Long Filter Blend", "Bass Swap / LPF", 32.0, true, false),
    MixStrategy::new("Standard Blend", "Eq Mixing", 16.0, true, true),
    MixStrategy::new("Filter Blend", "Bass Cut Out", 16.0, true, false),
    MixStrategy::new("Short Blend", "Wash Out / Echo", 8.0, false, false),
    MixStrategy::new("Quick Blend", "Quick Fade", 4.0, true, false),
];

#[napi]
pub fn suggest_transition(current_path: String, next_path: String) -> Option<TransitionProposal> {
    let cur = TrackAnalyzer::new(current_path, None, true).analyze()?;
    let next = TrackAnalyzer::new(next_path, Some(120.0), false).analyze()?;

    let bpm_a = cur.bpm.unwrap_or(128.0);
    let bpm_b = next.bpm.unwrap_or(128.0);
    let bpm_compatible = (bpm_a - bpm_b).abs() / bpm_a < 0.06;
    let key_compatible = is_camelot_compatible(cur.camelot_key.as_deref(), next.camelot_key.as_deref());

    let cur_out = cur.cut_out_pos.unwrap_or(cur.fade_out_pos);
    let next_in = next.first_beat_pos.unwrap_or(0.0);
    let next_intro_len = next.vocal_in_pos.unwrap_or(30.0) - next_in;

    let sec_per_bar = 240.0 / bpm_a;

    // 1. Try Standard Strategies
    for s in STRATEGIES {
        if s.req_bpm && !bpm_compatible { continue; }
        if s.req_key && !key_compatible { continue; }
        
        let dur = s.bars * sec_per_bar;
        if next_intro_len < dur { continue; } // Next track intro too short
        
        // Check if Current track has space
        let start = cur_out - dur; // Simple backward calculation
        if start < cur.mix_center_pos - 30.0 { continue; } // Too far back?
        
        // Success
        return Some(TransitionProposal {
            duration: dur,
            current_track_mix_out: start,
            next_track_mix_in: next_in,
            mix_type: format!("{} ({} Bars)", s.name, s.bars),
            filter_strategy: s.filter.to_string(),
            compatibility_score: 0.9,
            key_compatible,
            bpm_compatible,
        });
    }

    // 2. Fallback: Aggressive Bass Swap
    if bpm_compatible {
        let dur = 16.0 * sec_per_bar;
        if cur.duration - cur_out > dur {
             return Some(TransitionProposal {
                duration: dur,
                current_track_mix_out: cur_out - dur,
                next_track_mix_in: next_in,
                mix_type: "Aggressive Bass Swap".to_string(),
                filter_strategy: "Bass Swap".to_string(),
                compatibility_score: 0.7,
                key_compatible,
                bpm_compatible,
            });
        }
    }

    // 3. Fallback: Echo Out
    Some(TransitionProposal {
        duration: sec_per_bar * 4.0,
        current_track_mix_out: cur_out,
        next_track_mix_in: next_in,
        mix_type: "Echo Out".to_string(),
        filter_strategy: "Echo Freeze".to_string(),
        compatibility_score: 0.5,
        key_compatible,
        bpm_compatible,
    })
}

#[napi]
pub fn suggest_long_mix(current_path: String, next_path: String) -> Option<AdvancedTransition> {
    let cur = TrackAnalyzer::new(current_path, None, true).analyze()?;
    let next = TrackAnalyzer::new(next_path, Some(180.0), false).analyze()?;

    let bpm_a = cur.bpm.unwrap_or(128.0);
    let bpm_b = next.bpm.unwrap_or(128.0);
    let playback_rate = bpm_a / bpm_b;

    let target_bars = 32.0;
    let sec_per_bar = 240.0 / bpm_a;
    let duration = target_bars * sec_per_bar;

    // Anchor: End of Current Bass -> Start of Next Bass (Drop)
    let cur_end = cur.duration - 5.0; // Near end
    let next_start = next.drop_pos.or(next.vocal_in_pos).unwrap_or(32.0 * 240.0 / bpm_b);
    
    // Automation
    let (auto_a, auto_b) = generate_bass_swap_automation(duration);

    Some(AdvancedTransition {
        start_time_current: (cur_end - duration).max(0.0),
        start_time_next: (next_start - duration / playback_rate).max(0.0),
        duration,
        pitch_shift_semitones: 0, // Simplified for now
        playback_rate,
        automation_current: auto_a,
        automation_next: auto_b,
        strategy: "Long Bass Swap".to_string(),
    })
}

// --- Utils ---

fn get_camelot_key(root: i32, mode: i32) -> Option<String> {
    let map = if mode == 0 { // Major
        [12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
    } else { // Minor
        [9, 4, 11, 6, 1, 8, 3, 10, 5, 12, 7, 2]
    };
    let num = map.get(root as usize)?;
    let letter = if mode == 0 { "B" } else { "A" };
    Some(format!("{}{}", num, letter))
}

fn is_camelot_compatible(key_a: Option<&str>, key_b: Option<&str>) -> bool {
    let (Some(a), Some(b)) = (key_a, key_b) else { return false; };
    if a == b { return true; }
    // Parse
    let parse = |k: &str| -> Option<(i32, char)> {
        let mode = k.chars().last()?;
        let num = k[..k.len()-1].parse().ok()?;
        Some((num, mode))
    };
    let (Some((na, ma)), Some((nb, mb))) = (parse(a), parse(b)) else { return false; };
    
    let diff = (na - nb).abs();
    (diff == 1 || diff == 11) && ma == mb
}

fn generate_bass_swap_automation(dur: f64) -> (Vec<AutomationPoint>, Vec<AutomationPoint>) {
    let mid = dur / 2.0;
    let mut a = Vec::new();
    let mut b = Vec::new();
    
    // A: 1.0 -> 1.0 (BassCut) -> 0.0
    // B: 0.0 -> 1.0 (BassCut) -> 1.0
    
    a.push(AutomationPoint { time_offset: 0.0, volume: 1.0, low_cut: 0.0, high_cut: 0.0 });
    a.push(AutomationPoint { time_offset: mid, volume: 0.9, low_cut: 0.8, high_cut: 0.0 });
    a.push(AutomationPoint { time_offset: dur, volume: 0.0, low_cut: 1.0, high_cut: 0.0 });

    b.push(AutomationPoint { time_offset: 0.0, volume: 0.0, low_cut: 1.0, high_cut: 0.0 });
    b.push(AutomationPoint { time_offset: mid, volume: 0.9, low_cut: 0.8, high_cut: 0.0 });
    b.push(AutomationPoint { time_offset: dur, volume: 1.0, low_cut: 0.0, high_cut: 0.0 });
    
    (a, b)
}

// --- Exports ---

#[napi]
pub fn analyze_audio_file(path: String, max_analyze_time: Option<f64>) -> Option<AudioAnalysis> {
    TrackAnalyzer::new(path, max_analyze_time, true).analyze()
}

#[napi]
pub fn analyze_audio_file_head(path: String, max_analyze_time: Option<f64>) -> Option<AudioAnalysis> {
    TrackAnalyzer::new(path, max_analyze_time, false).analyze()
}
