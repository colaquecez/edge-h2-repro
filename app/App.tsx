import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendRequest } from './src/xhr';

const PROTOCOL_PROBE_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const MAX_LOG_LINES = 40;

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [baseUrl, setBaseUrl] = useState('https://');
  const [count, setCount] = useState('20');
  const [gapSeconds, setGapSeconds] = useState('3');
  const [isRunning, setIsRunning] = useState(false);
  const [protocol, setProtocol] = useState('unknown');
  const [sent, setSent] = useState(0);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [serverReceived, setServerReceived] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const shouldStop = useRef(false);

  const appendLog = (line: string) =>
    setLog((previous) => [`${new Date().toLocaleTimeString()} ${line}`, ...previous].slice(0, MAX_LOG_LINES));

  const cleanBaseUrl = () => baseUrl.trim().replace(/\/$/, '');

  const checkProtocol = async () => {
    const result = await sendRequest('GET', PROTOCOL_PROBE_URL);
    setProtocol(result.responseText.match(/http=(.*)/)?.[1] ?? `failed: ${result.nativeError}`);
  };

  const fetchServerStats = async () => {
    const result = await sendRequest('GET', `${cleanBaseUrl()}/stats`);
    const parsed = result.succeeded ? JSON.parse(result.responseText) : null;
    setServerReceived(parsed?.received ?? null);
    if (!result.succeeded) appendLog(`stats failed: ${result.nativeError ?? result.status}`);
  };

  const resetEverything = async () => {
    await sendRequest('POST', `${cleanBaseUrl()}/reset`, {});
    setSent(0);
    setSucceeded(0);
    setFailed(0);
    setServerReceived(0);
    setLog([]);
  };

  const run = async () => {
    shouldStop.current = false;
    setIsRunning(true);
    const total = Number(count) || 1;
    const gapMilliseconds = (Number(gapSeconds) || 0) * 1000;

    for (let index = 0; index < total && !shouldStop.current; index += 1) {
      setSent((previous) => previous + 1);
      const result = await sendRequest('POST', `${cleanBaseUrl()}/echo`, { id: createId() });
      if (result.succeeded) {
        setSucceeded((previous) => previous + 1);
        appendLog(`#${index + 1} ok ${result.durationMs}ms`);
      } else {
        setFailed((previous) => previous + 1);
        appendLog(
          `#${index + 1} FAIL ${result.durationMs}ms status=${result.status} native=${result.nativeError ?? 'unavailable'}`,
        );
      }
      if (index < total - 1) await sleep(gapMilliseconds);
    }

    setIsRunning(false);
    await fetchServerStats();
  };

  const lostResponses = serverReceived === null ? null : serverReceived - succeeded;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edge repro</Text>

        <Text style={styles.label}>Server base URL</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>POSTs</Text>
            <TextInput style={styles.input} value={count} onChangeText={setCount} keyboardType="number-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Gap (s)</Text>
            <TextInput
              style={styles.input}
              value={gapSeconds}
              onChangeText={setGapSeconds}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.row}>
          <Button title="Run" onPress={run} disabled={isRunning} />
          <Button title="Stop" onPress={() => (shouldStop.current = true)} disabled={!isRunning} />
          <Button title="Reset" onPress={resetEverything} disabled={isRunning} />
        </View>
        <View style={styles.row}>
          <Button title="Check protocol" onPress={checkProtocol} />
          <Button title="Server stats" onPress={fetchServerStats} />
        </View>

        <Text style={styles.stat}>Client protocol: {protocol}</Text>
        <Text style={styles.stat}>
          Sent {sent} / ok {succeeded} / failed {failed}
        </Text>
        <Text style={styles.stat}>
          Server received: {serverReceived ?? '?'}{' '}
          {lostResponses !== null && lostResponses > 0 ? `(${lostResponses} processed but response lost)` : ''}
        </Text>

        {log.map((line) => (
          <Text key={line} style={styles.log}>
            {line}
          </Text>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 12, color: '#666666' },
  input: { borderWidth: 1, borderColor: '#cccccc', borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  field: { flex: 1, gap: 4 },
  stat: { fontSize: 15, fontWeight: '600' },
  log: { fontFamily: 'Courier', fontSize: 11 },
});
