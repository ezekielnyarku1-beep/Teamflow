import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkNewPassword, isEmail } from '../src/lib/authValidation.js'

test('email check', () => {
  assert.equal(isEmail(' ada@example.com '), true)
  assert.equal(isEmail('ada@example'), false)
  assert.equal(isEmail('ada example.com'), false)
})

test('new password rules', () => {
  assert.doesNotThrow(() => checkNewPassword('abcdefg1', 'abcdefg1'))
  assert.throws(() => checkNewPassword('abc1', 'abc1'), /8 characters/)
  assert.throws(() => checkNewPassword('12345678', '12345678'), /letter/)
  assert.throws(() => checkNewPassword('abcdefgh', 'abcdefgh'), /number/)
  assert.throws(() => checkNewPassword('abcdefg1', 'abcdefg2'), /do not match/)
})
