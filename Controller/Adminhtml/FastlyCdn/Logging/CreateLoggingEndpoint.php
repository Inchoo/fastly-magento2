<?php
/**
 * Fastly CDN for Magento
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Fastly CDN for Magento End User License Agreement
 * that is bundled with this package in the file LICENSE_FASTLY_CDN.txt.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade Fastly CDN to newer
 * versions in the future. If you wish to customize this module for your
 * needs please refer to http://www.magento.com for more information.
 *
 * @category    Fastly
 * @package     Fastly_Cdn
 * @copyright   Copyright (c) 2016 Fastly, Inc. (http://www.fastly.com)
 * @license     BSD, see LICENSE_FASTLY_CDN.txt
 */
namespace Fastly\Cdn\Controller\Adminhtml\FastlyCdn\Logging;

use Fastly\Cdn\Model\Config;
use Fastly\Cdn\Model\Api;
use Fastly\Cdn\Helper\Vcl;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\JsonFactory;

class CreateLoggingEndpoint extends Action
{
    /**
     * @var Api
     */
    private $api;
    /**
     * @var Config
     */
    private $config;
    /**
     * @var JsonFactory
     */
    private $resultJsonFactory;

    private $vcl;

    /**
     * CreateLoggingEndpoint constructor.
     * @param Context $context
     * @param Config $config
     * @param Api $api
     * @param Vcl $vcl
     * @param JsonFactory $resultJsonFactory
     */
    public function __construct(
        Context $context,
        Config $config,
        Api $api,
        Vcl $vcl,
        JsonFactory $resultJsonFactory
    ) {
        $this->api = $api;
        $this->config = $config;
        $this->vcl = $vcl;
        $this->resultJsonFactory = $resultJsonFactory;

        parent::__construct($context);
    }

    public function execute()
    {
        $result = $this->resultJsonFactory->create();
        try {
            $activeVersion = $this->getRequest()->getParam('active_version');
            $condition = $this->getRequest()->getParam('condition');
            $backend = $this->getRequest()->getParam('backend');
            $endpointStatus = $this->getRequest()->getParam('endpoint_status');
            $service = $this->api->checkServiceDetails();
            $this->vcl->checkCurrentVersionActive($service->versions, $activeVersion);
            $currActiveVersion = $this->vcl->getCurrentVersion($service->versions);
            $clone = $this->api->cloneVersion($currActiveVersion);

            $params = [
                'name'                  => Config::LOGGING_ENDPOINT_NAME,
                'url'                   => 'https://' . $backend,
                'message_type'          => 'blank'
            ];
            if (!empty($condition)) {
                $params += [
                    'response_condition' => $condition
                ];
            }
            if ($endpointStatus != 'true') {
                $configureEndpoint = $this->api->createHttpEndpoint($params, $clone->number);
            } else {
                $configureEndpoint = $this->api->updateHttpEndpoint($params, $clone->number, Config::LOGGING_ENDPOINT_NAME);
            }

            if (!$configureEndpoint) {
                return $result->setData([
                    'status'    => false,
                    'msg'       => 'Failed to configure logging endpoint'
                ]);
            }

            $this->api->validateServiceVersion($clone->number);
            $this->api->activateVersion($clone->number);

            return $result->setData([
                'status'    => true
            ]);
        } catch (\Exception $e) {
            return $result->setData([
                'status'    => false,
                'msg'       => $e->getMessage()
            ]);
        }
    }
}
