// ==UserScript==
// @name         CRM AVCB — Auto-preencher Bombeiros
// @namespace    crm-avcb
// @version      1.0.0
// @description  Preenche cidade, logradouro e número na consulta de AVCB do Corpo de Bombeiros de SP a partir do CRM AVCB. O código de verificação (CAPTCHA) continua sendo resolvido manualmente por você.
// @match        https://viafacil2.policiamilitar.sp.gov.br/sgsci/Publico/PesquisarAVCBLogradouro.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function parsePayload() {
    var match = location.hash.match(/avcb=([^&]+)/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }

  var payload = parsePayload();
  if (!payload) return;

  // Remove o fragmento da URL para nao repreencher em postbacks da pagina.
  history.replaceState(null, "", location.pathname + location.search);

  // Normaliza para comparar nomes de municipio ignorando acentos e maiusculas.
  function norm(s) {
    return (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toUpperCase();
  }

  function setInput(id, value) {
    var el = document.getElementById(id);
    if (el && value) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  setInput("txtLogradouroPesquisa", payload.logradouro);
  setInput("txtNumero", payload.numero);

  // O dropdown de municipio e carregado via AJAX; espera as opcoes aparecerem.
  if (payload.municipio) {
    var target = norm(payload.municipio);
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var sel = document.getElementById("MunicipioPesquisa");
      if (sel && sel.options.length > 1) {
        for (var i = 0; i < sel.options.length; i++) {
          if (norm(sel.options[i].textContent) === target) {
            sel.value = sel.options[i].value;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            break;
          }
        }
        clearInterval(timer);
      } else if (tries > 50) {
        clearInterval(timer); // desiste apos ~15s
      }
    }, 300);
  }

  // Coloca o cursor no campo do codigo de verificacao para agilizar.
  var captcha = document.getElementById("txtCaptcha");
  if (captcha) captcha.focus();
})();
