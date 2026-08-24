import assert from 'node:assert/strict';
import test from 'node:test';
import {translateText} from './i18n';

test('translates exact interface copy while preserving whitespace', () => {
  assert.equal(translateText('  Mission control  ', 'es'), '  Control de misión  ');
  assert.equal(translateText('Mission control', 'en'), 'Mission control');
});

test('translates safe fallback terms in dynamic interface messages', () => {
  assert.equal(
    translateText('No visitors registered yet', 'es'),
    'Aún no hay visitantes registrados',
  );
  assert.equal(translateText('Public project workspace', 'es'), 'público proyecto espacio de trabajo');
});

test('does not alter identifiers or numeric values', () => {
  assert.equal(translateText('NDA-US-INVESTOR-v1', 'es'), 'NDA-US-INVESTOR-v1');
  assert.equal(translateText('61.4%', 'es'), '61.4%');
});
