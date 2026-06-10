(function () {
    function ensureModal() {
        let modal = document.getElementById('app-modal-feedback');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'app-modal-feedback';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header" id="app-modal-header">
                        <h5 class="modal-title fw-bold" id="app-modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="d-flex gap-3">
                            <div id="app-modal-icon" class="fs-2"></div>
                            <div class="flex-grow-1">
                                <div id="app-modal-message" class="mb-0"></div>
                                <textarea id="app-modal-input" class="form-control mt-3 d-none" rows="3"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-outline-secondary" id="app-modal-cancel"></button>
                        <button type="button" class="btn btn-primary" id="app-modal-confirm"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function typeConfig(type) {
        const configs = {
            success: { header: 'bg-success text-white', icon: 'bi bi-check-circle-fill text-success' },
            danger: { header: 'bg-danger text-white', icon: 'bi bi-x-circle-fill text-danger' },
            warning: { header: 'bg-warning text-dark', icon: 'bi bi-exclamation-triangle-fill text-warning' },
            info: { header: 'bg-primary text-white', icon: 'bi bi-info-circle-fill text-primary' }
        };
        return configs[type] || configs.info;
    }

    window.showAppModal = function ({
        title = 'Aviso',
        message = '',
        type = 'info',
        confirmText = 'OK',
        cancelText = '',
        prompt = false,
        defaultValue = ''
    } = {}) {
        return new Promise(resolve => {
            const modalEl = ensureModal();
            const cfg = typeConfig(type);
            const header = document.getElementById('app-modal-header');
            const titleEl = document.getElementById('app-modal-title');
            const iconEl = document.getElementById('app-modal-icon');
            const msgEl = document.getElementById('app-modal-message');
            const inputEl = document.getElementById('app-modal-input');
            const cancelBtn = document.getElementById('app-modal-cancel');
            const confirmBtn = document.getElementById('app-modal-confirm');

            header.className = `modal-header ${cfg.header}`;
            titleEl.textContent = title;
            iconEl.innerHTML = `<i class="${cfg.icon}"></i>`;
            msgEl.innerHTML = String(message).replace(/\n/g, '<br>');
            inputEl.classList.toggle('d-none', !prompt);
            inputEl.value = defaultValue || '';
            cancelBtn.textContent = cancelText || 'Cancelar';
            cancelBtn.classList.toggle('d-none', !cancelText && !prompt);
            confirmBtn.textContent = confirmText || 'OK';

            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            let settled = false;

            const cleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                modalEl.removeEventListener('hidden.bs.modal', onHidden);
            };
            const finish = value => {
                settled = true;
                cleanup();
                modal.hide();
                resolve(value);
            };
            const onConfirm = () => finish(prompt ? inputEl.value : true);
            const onCancel = () => finish(prompt ? null : false);
            const onHidden = () => {
                if (!settled) {
                    cleanup();
                    resolve(prompt ? null : false);
                }
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            modalEl.addEventListener('hidden.bs.modal', onHidden);
            modal.show();
            if (prompt) setTimeout(() => inputEl.focus(), 200);
        });
    };

    window.showInfoModal = function (message, title = 'Aviso', type = 'info') {
        return window.showAppModal({ title, message, type, confirmText: 'OK' });
    };

    window.showConfirmModal = function (message, title = 'Confirmar', type = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return window.showAppModal({ title, message, type, confirmText, cancelText });
    };

    window.showPromptModal = function (message, defaultValue = '', title = 'Informe os dados') {
        return window.showAppModal({ title, message, type: 'info', confirmText: 'Confirmar', cancelText: 'Cancelar', prompt: true, defaultValue });
    };
})();
