<?php

namespace App\Support;

/**
 * Valida cédulas de identidad ecuatorianas según el algoritmo del Registro Civil.
 *
 * Pasos de validación:
 *  1. Exactamente 10 dígitos numéricos.
 *  2. Primeros dos dígitos (provincia) entre 01–24 ó 30.
 *  3. Tercer dígito < 6 (reservado para personas naturales; ≥6 es RUC de entidades).
 *  4. Módulo 10 con coeficientes alternados [2,1,2,1,2,1,2,1,2]: al multiplicar, si el
 *     resultado ≥ 10 se restan 9; la suma total debe coincidir con el décimo dígito verificador.
 */
class ValidarCedulaEcuador
{
    /**
     * Retorna `true` si la cédula supera todas las verificaciones del Registro Civil.
     *
     * @param string $cedula Diez dígitos sin separadores.
     */
    public static function validar(string $cedula): bool
    {
        // Longitud
        if (!preg_match('/^\d{10}$/', $cedula)) {
            return false;
        }

        // Provincia
        $provincia = intval(substr($cedula, 0, 2));
        if (!(($provincia >= 1 && $provincia <= 24) || $provincia === 30)) {
            return false;
        }

        // Tercer dígito
        $tercerDigito = intval($cedula[2]);
        if ($tercerDigito >= 6) {
            return false;
        }

        // Módulo 10
        $coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        $suma = 0;
        for ($i = 0; $i < 9; $i++) {
            $valor = intval($cedula[$i]) * $coeficientes[$i];
            if ($valor >= 10) {
                $valor -= 9;
            }
            $suma += $valor;
        }
        $decenaSuperior = ceil($suma / 10) * 10;
        $digitoVerificador = $decenaSuperior - $suma;
        if ($digitoVerificador === 10) {
            $digitoVerificador = 0;
        }
        return intval($cedula[9]) === $digitoVerificador;
    }
}
