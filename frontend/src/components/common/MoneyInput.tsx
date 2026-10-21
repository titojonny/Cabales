import React from 'react';
import { Delete } from 'lucide-react';
import { centavosADecimal } from '../../utils/currency';

interface MoneyInputProps {
  centavos: number;
  onChange: (newCentavos: number) => void;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ centavos, onChange }) => {
  const appendDigit = (digit: number) => {
    if (centavos === 0 && digit === 0) return;
    const nextVal = centavos * 10 + digit;
    if (nextVal > 99999999) return;
    onChange(nextVal);
  };

  const appendDoubleZero = () => {
    if (centavos === 0) return;
    const nextVal = centavos * 100;
    if (nextVal > 99999999) return;
    onChange(nextVal);
  };

  const deleteDigit = () => {
    const nextVal = Math.floor(centavos / 10);
    onChange(nextVal);
  };

  const addCents = (amount: number) => {
    const nextVal = centavos + amount;
    if (nextVal > 99999999) return;
    onChange(nextVal);
  };

  const displayAmount = centavosADecimal(centavos).toFixed(2);

  return (
    <div className="money-input-container">
      {/* Display central */}
      <div className="money-display-container">
        <span className="money-currency-symbol">$</span>
        <span className="money-amount-number tabular-nums">{displayAmount}</span>
      </div>

      {/* Quick Add Chips */}
      <div className="quick-add-row">
        <button type="button" className="quick-chip" onClick={() => addCents(100)}>+$1</button>
        <button type="button" className="quick-chip" onClick={() => addCents(500)}>+$5</button>
        <button type="button" className="quick-chip" onClick={() => addCents(1000)}>+$10</button>
        <button type="button" className="quick-chip" onClick={() => addCents(2000)}>+$20</button>
      </div>

      {/* Virtual Keypad */}
      <div className="keypad-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            className="keypad-btn"
            onClick={() => appendDigit(num)}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          className="keypad-btn double-zero"
          onClick={appendDoubleZero}
        >
          00
        </button>
        <button
          type="button"
          className="keypad-btn"
          onClick={() => appendDigit(0)}
        >
          0
        </button>
        <button
          type="button"
          className="keypad-btn backspace-btn"
          onClick={deleteDigit}
          aria-label="Borrar dígito"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
};
