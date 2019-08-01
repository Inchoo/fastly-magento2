define([
    "jquery",
    "setServiceLabel",
    "overlay",
    "resetAllMessages",
    "showErrorMessage",
    'mage/translate'
], function ($, setServiceLabel, overlay, resetAllMessages, showErrorMessage) {
    return function (config, serviceStatus, isAlreadyConfigured) {
        /* VCL button messages */
        let successVclBtnMsg = $('#fastly-success-vcl-button-msg');
        let errorVclBtnMsg = $('#fastly-error-vcl-button-msg');
        let active_version = serviceStatus.active_version;

        $(document).ready(function () {
            isWarningDismissed(active_version);

            let uploadOptions = {
                title: jQuery.mage.__('You are about to upload VCL to Fastly '),
                content: function () {
                    return document.getElementById('fastly-uploadvcl-template').textContent;
                },
                actionOk: function () {
                    uploadVcl(active_version);
                }
            };

            function isWarningDismissed(activeVersion)
            {
                $.ajax({
                    type: 'GET',
                    url: config.isWarningDismissed,
                    data: {active_version: activeVersion},
                    showLoader: true,
                    success: function (response) {
                        if(response.status !== false){
                            if(response.dismissed !== true){
                                compareVclVersions(activeVersion);
                                return;
                            }
                            return;
                        }
                        return errorVclBtnMsg.text($.mage.__(response.msg)).show();
                    }
                })
            }

            function compareVclVersions()
            {
                $.ajax({
                   type: 'GET',
                   url: config.vclComparison,
                   showLoader: false,
                   data: {'active_version':active_version},
                   success: function (response) {
                      if(response.status !== true){
                          let span = document.createElement('span');
                          span.setAttribute('id','dismiss-vcl-warning');
                          let text = document.createTextNode(response.msg);
                          span.append(text);
                          let warning = document.createElement('div');
                          warning.setAttribute('class', 'message message-warning');
                          warning.setAttribute('id', 'fastly-warning-vcl');
                          warning.append(span);
                          $("#row_system_full_page_cache_fastly_fastly_service_id td:last-child").append(warning);
                          openDismissModal();
                      }
                   }
                });
            }

            /**
             * VCL Upload button on click event
             */
            $('#fastly_vcl_upload_button').on('click', function () {
                if (isAlreadyConfigured !== true) {
                    $(this).attr('disabled', true);
                    return alert($.mage.__('Please save config prior to continuing.'));
                }

                resetAllMessages();

                $.when(
                    $.ajax({
                        type: "GET",
                        url: config.serviceInfoUrl,
                        showLoader: true
                    })
                ).done(function (service) {
                    if (service.status === false) {
                        return errorVclBtnMsg.text($.mage.__('Please check your Service ID and API token and try again.')).show();
                    }

                    active_version = service.active_version;
                    let next_version = service.next_version;
                    let service_name = service.service.name;
                    overlay(uploadOptions);
                    setServiceLabel(active_version, next_version, service_name);

                }).fail(function () {
                    return errorVclBtnMsg.text($.mage.__('An error occurred while processing your request. Please try again.')).show();
                });
            });

            /**
             * Upload VCL snippets to the Fastly service
             */
            function uploadVcl()
            {
                let activate_vcl_flag = false;

                if ($('#fastly_activate_vcl').is(':checked')) {
                    activate_vcl_flag = true;
                }

                $.ajax({
                    type: "POST",
                    url: config.vclUploadUrl,
                    data: {
                        'activate_flag': activate_vcl_flag,
                        'active_version': active_version
                    },
                    showLoader: true
                }).done(function (response) {
                    if (response.status === true) {
                        modal.modal('closeModal');
                        successVclBtnMsg.text($.mage.__('VCL file is successfully uploaded to the Fastly service.')).show();
                    } else {
                        resetAllMessages();
                        showErrorMessage(response.msg);
                    }
                });
            }

            function openDismissModal()
            {
                let dismissWarningOptions = {
                    title: jQuery.mage.__('Dismiss warning'),
                    content: function () {
                        return document.getElementById('fastly-dismiss-vcl-warning-template').textContent;
                    },
                    actionOk: function () {
                        dismissWarning(active_version);
                    }
                };

                $("#fastly-warning-vcl").on('click', function () {
                    resetAllMessages();
                    overlay(dismissWarningOptions);
                    $(".upload-button").text('Dismiss');
                });

                function dismissWarning(version)
                {
                    $.ajax({
                       type: 'GET',
                       url: config.dismissWarning,
                       showLoader: true,
                       data: {active_version: version},
                       success: function (response) {
                           if(response.status !== false){
                               $("#fastly-warning-vcl").remove();
                               modal.modal('closeModal');
                               return successVclBtnMsg.text($.mage.__(response.msg)).show();
                           }
                           modal.modal('closeModal');
                           return errorVclBtnMsg.text($.mage.__(response.msg)).show();
                       }
                    });
                }
            }
        });
    }
});